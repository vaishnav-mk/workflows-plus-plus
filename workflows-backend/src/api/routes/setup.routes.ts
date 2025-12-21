import { Hono } from "hono";
import { z } from "zod";
import { HTTP_STATUS_CODES, CLOUDFLARE } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../types/api";
import { logger } from "../../core/logging/logger";
import { createAuthToken } from "../../core/utils/jwt";
import { SetupRequestSchema } from "../../core/validation/schemas";
import { getSSECorsHeaders } from "../../core/cors.config";
import { zValidator } from "../../api/middleware/validation.middleware";
import { safe } from "../../core/utils/route-helpers";
import { rateLimitMiddleware } from "../../api/middleware/rate-limit.middleware";
import { SetupEnv } from "../../types/routes";

async function verifyCloudflareToken(apiToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${CLOUDFLARE.API_BASE}/user/tokens/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      }
    });
    return response.ok;
  } catch (error) {
    logger.error("failed to verify cloudflare token", error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

function sendSSEMessage(controller: ReadableStreamDefaultController, event: string, data: unknown): void {
  try {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(message));
  } catch (e) {
  }
}

async function streamSetupProgress(
  controller: ReadableStreamDefaultController,
  apiToken: string,
  accountId: string
): Promise<void> {
  try {
    logger.info("[setup] step 1: validating token");
    sendSSEMessage(controller, "progress", {
      step: "validate-token",
      status: "loading",
      label: "Validating token"
    });

    const verifyResponse = await fetch(`${CLOUDFLARE.API_BASE}/user/tokens/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!verifyResponse.ok) {
      logger.warn("[setup] token validation failed");
      sendSSEMessage(controller, "progress", {
        step: "validate-token",
        status: "error",
        label: "Validating token",
        message: "Token validation failed"
      });
      sendSSEMessage(controller, "error", {
        message: "Invalid API token or Account ID"
      });
      controller.close();
      return;
    }

    logger.info("[setup] token validated successfully");
    sendSSEMessage(controller, "progress", {
      step: "validate-token",
      status: "success",
      label: "Validating token",
      message: "Token validated successfully"
    });

    logger.info("[setup] step 2: getting list of databases");
    sendSSEMessage(controller, "progress", {
      step: "databases",
      status: "loading",
      label: "Getting list of databases"
    });

    const databasesResponse = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${accountId}/d1/database?page=1&per_page=1000`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!databasesResponse.ok) {
      logger.warn("[setup] failed to fetch databases");
      sendSSEMessage(controller, "progress", {
        step: "databases",
        status: "error",
        label: "Getting list of databases",
        message: "Failed to fetch databases"
      });
    } else {
      const databasesData = await databasesResponse.json() as {
        result?: Array<unknown>;
      };
      const dbCount = databasesData.result?.length || 0;
      logger.info(`[setup] found ${dbCount} database(s)`);
      sendSSEMessage(controller, "progress", {
        step: "databases",
        status: "success",
        label: "Getting list of databases",
        message: `Found ${dbCount} database${dbCount !== 1 ? "s" : ""}`
      });
    }

    logger.info("[setup] step 3: listing kv namespaces");
    sendSSEMessage(controller, "progress", {
      step: "kv-namespaces",
      status: "loading",
      label: "Listing KV namespaces"
    });

    const kvResponse = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${accountId}/storage/kv/namespaces`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!kvResponse.ok) {
      logger.warn("[setup] failed to fetch kv namespaces");
      sendSSEMessage(controller, "progress", {
        step: "kv-namespaces",
        status: "error",
        label: "Listing KV namespaces",
        message: "Failed to fetch KV namespaces"
      });
    } else {
      const kvData = await kvResponse.json() as {
        result?: Array<unknown>;
      };
      const kvCount = kvData.result?.length || 0;
      logger.info(`[setup] found ${kvCount} kv namespace(s)`);
      sendSSEMessage(controller, "progress", {
        step: "kv-namespaces",
        status: "success",
        label: "Listing KV namespaces",
        message: `Found ${kvCount} KV namespace${kvCount !== 1 ? "s" : ""}`
      });
    }

    logger.info("[setup] step 4: listing workflows");
    sendSSEMessage(controller, "progress", {
      step: "workflows",
      status: "loading",
      label: "Listing workflows"
    });

    const workflowsResponse = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${accountId}/workflows?page=1&per_page=10`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!workflowsResponse.ok) {
      logger.warn("[setup] failed to fetch workflows");
      sendSSEMessage(controller, "progress", {
        step: "workflows",
        status: "error",
        label: "Listing workflows",
        message: "Failed to fetch workflows - check API token permissions"
      });
    } else {
      const workflowsData = await workflowsResponse.json() as {
        result?: Array<unknown>;
        result_info?: { total_count?: number };
      };
      const workflowsCount = workflowsData.result_info?.total_count || workflowsData.result?.length || 0;
      logger.info(`[setup] found ${workflowsCount} workflow(s)`);
      sendSSEMessage(controller, "progress", {
        step: "workflows",
        status: "success",
        label: "Listing workflows",
        message: `Found ${workflowsCount} workflow${workflowsCount !== 1 ? "s" : ""}`
      });
    }

    logger.info("[setup] step 5: listing workers");
    sendSSEMessage(controller, "progress", {
      step: "workers",
      status: "loading",
      label: "Listing workers"
    });

    const workersResponse = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${accountId}/workers/workers?page=1&per_page=10`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!workersResponse.ok) {
      logger.warn("[setup] failed to fetch workers");
      sendSSEMessage(controller, "progress", {
        step: "workers",
        status: "error",
        label: "Listing workers",
        message: "Failed to fetch workers - check API token permissions"
      });
    } else {
      const workersData = await workersResponse.json() as {
        result?: Array<unknown>;
        result_info?: { total_count?: number };
      };
      const workersCount = workersData.result_info?.total_count || workersData.result?.length || 0;
      logger.info(`[setup] found ${workersCount} worker(s)`);
      sendSSEMessage(controller, "progress", {
        step: "workers",
        status: "success",
        label: "Listing workers",
        message: `Found ${workersCount} worker${workersCount !== 1 ? "s" : ""}`
      });
    }

    logger.info("[setup] all checks completed successfully");
    sendSSEMessage(controller, "complete", {
      success: true,
      message: "All checks completed successfully"
    });

    controller.close();
  } catch (error) {
    logger.error(
      "failed to stream setup progress",
      error instanceof Error ? error : new Error(String(error))
    );
    sendSSEMessage(controller, "error", {
      message: error instanceof Error ? error.message : "Unknown error occurred"
    });
    controller.close();
  }
}

const app = new Hono<{ Bindings: SetupEnv }>();

app.post("/stream", rateLimitMiddleware(), zValidator('json', SetupRequestSchema), safe(async c => {
  try {
    logger.info("setting up cloudflare credentials with sse streaming");

    const { apiToken, accountId } = c.req.valid('json' as never) as z.infer<typeof SetupRequestSchema>;

    const stream = new ReadableStream({
      async start(controller) {
        await streamSetupProgress(controller, apiToken, accountId);
      }
    });

    const origin = c.req.header("Origin");
    const headers: HeadersInit = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...getSSECorsHeaders(origin, "POST")
    };
    return new Response(stream, { headers });
  } catch (error) {
    logger.error(
      "failed to setup sse stream",
      error instanceof Error ? error : new Error(String(error))
    );
    return c.json(
      {
        success: false,
        error: "failed to setup sse stream",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
}));

app.post("/", rateLimitMiddleware(), zValidator('json', SetupRequestSchema), safe(async c => {
  try {
    logger.info("setting up cloudflare credentials");

    const { apiToken, accountId } = c.req.valid('json' as never) as z.infer<typeof SetupRequestSchema>;

    logger.info("verifying cloudflare credentials");
    const isValid = await verifyCloudflareToken(apiToken);

    if (!isValid) {
      logger.warn("invalid cloudflare credentials provided");
      return c.json(
        {
          success: false,
          error: "invalid credentials",
          message: "the provided api token or account id is invalid",
          code: ErrorCode.AUTHENTICATION_ERROR
        },
        401
      );
    }

    const token = await createAuthToken({ apiToken, accountId }, c.env.CREDENTIALS_MASTER_KEY!);

    logger.info("cloudflare credentials configured successfully");

    const response: ApiResponse = {
      success: true,
      data: { 
        configured: true,
        token
      },
      message: "credentials configured successfully"
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error(
      "failed to setup credentials",
      error instanceof Error ? error : new Error(String(error))
    );
    return c.json(
      {
        success: false,
        error: "failed to setup credentials",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
}));

app.get("/test-credentials", safe(async c => {
  const env = c.env as SetupEnv;
  
  const testToken = env.TEST_API_TOKEN;
  const testAccountId = env.TEST_ACCOUNT_ID;

  if (!testToken || !testAccountId) {
    return c.json({
      success: false,
      error: "Test credentials not configured",
      message: "Test credentials are not available. Set TEST_API_TOKEN and TEST_ACCOUNT_ID as Wrangler secrets."
    }, HTTP_STATUS_CODES.NOT_FOUND);
  }

  return c.json({
    success: true,
    data: {
      apiToken: testToken,
      accountId: testAccountId
    },
    message: "Test credentials retrieved"
  }, HTTP_STATUS_CODES.OK);
}));

app.post("/logout", rateLimitMiddleware(), async c => {
  try {
    const response: ApiResponse = {
      success: true,
      data: { loggedOut: true },
      message: "Logged out successfully"
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error(
      "Failed to logout",
      error instanceof Error ? error : new Error(String(error))
    );
    return c.json(
      {
        success: false,
        error: "Failed to logout",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;
