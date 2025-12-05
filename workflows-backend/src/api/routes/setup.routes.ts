/**
 * Setup Routes
 * Handles credential setup and logout
 */

import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { HTTP_STATUS_CODES, CLOUDFLARE } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../core/api-contracts";
import { logger } from "../../core/logging/logger";
import { encryptCredentials } from "../../core/utils/credentials";
import {
  validateBody,
  validationErrorResponse
} from "../../core/validation/validator";
import { SetupRequestSchema } from "../../core/validation/schemas";

const CREDENTIALS_COOKIE_NAME = "cf_credentials";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

interface Env {
  ENVIRONMENT?: string;
  [key: string]: unknown;
}

/**
 * Verify Cloudflare API token by calling the verify endpoint
 */
async function verifyCloudflareToken(
  apiToken: string,
  accountId: string
): Promise<boolean> {
  try {
    const verifyUrl = `${CLOUDFLARE.API_BASE}/accounts/${accountId}/tokens/verify`;

    const response = await fetch(verifyUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      }
    });

    return response.ok;
  } catch (error) {
    logger.error(
      "Failed to verify Cloudflare token",
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

/**
 * Send SSE message
 */
function sendSSEMessage(controller: ReadableStreamDefaultController, event: string, data: unknown): void {
  try {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(message));
  } catch (e) {
    // Connection closed
  }
}

/**
 * Stream setup progress via SSE
 */
async function streamSetupProgress(
  controller: ReadableStreamDefaultController,
  apiToken: string,
  accountId: string
): Promise<void> {
  try {
    // Step 1: Validate token
    logger.info("[Setup] Step 1: Validating token");
    console.log("[Setup] Step 1: Validating token");
    sendSSEMessage(controller, "progress", {
      step: "validate-token",
      status: "loading",
      label: "Validating token"
    });

    const verifyResponse = await fetch(`${CLOUDFLARE.API_BASE}/accounts/${accountId}/tokens/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!verifyResponse.ok) {
      logger.warn("[Setup] Token validation failed");
      console.log("[Setup] Token validation failed");
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

    logger.info("[Setup] Token validated successfully");
    console.log("[Setup] Token validated successfully");
    sendSSEMessage(controller, "progress", {
      step: "validate-token",
      status: "success",
      label: "Validating token",
      message: "Token validated successfully"
    });

    // Step 2: Get databases
    logger.info("[Setup] Step 2: Getting list of databases");
    console.log("[Setup] Step 2: Getting list of databases");
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
      logger.warn("[Setup] Failed to fetch databases");
      console.log("[Setup] Failed to fetch databases");
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
      logger.info(`[Setup] Found ${dbCount} database(s)`);
      console.log(`[Setup] Found ${dbCount} database(s)`);
      sendSSEMessage(controller, "progress", {
        step: "databases",
        status: "success",
        label: "Getting list of databases",
        message: `Found ${dbCount} database${dbCount !== 1 ? "s" : ""}`
      });
    }

    // Step 3: List KV namespaces
    logger.info("[Setup] Step 3: Listing KV namespaces");
    console.log("[Setup] Step 3: Listing KV namespaces");
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
      logger.warn("[Setup] Failed to fetch KV namespaces");
      console.log("[Setup] Failed to fetch KV namespaces");
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
      logger.info(`[Setup] Found ${kvCount} KV namespace(s)`);
      console.log(`[Setup] Found ${kvCount} KV namespace(s)`);
      sendSSEMessage(controller, "progress", {
        step: "kv-namespaces",
        status: "success",
        label: "Listing KV namespaces",
        message: `Found ${kvCount} KV namespace${kvCount !== 1 ? "s" : ""}`
      });
    }

    // Step 4: List workflows
    logger.info("[Setup] Step 4: Listing workflows");
    console.log("[Setup] Step 4: Listing workflows");
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
      logger.warn("[Setup] Failed to fetch workflows");
      console.log("[Setup] Failed to fetch workflows");
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
      logger.info(`[Setup] Found ${workflowsCount} workflow(s)`);
      console.log(`[Setup] Found ${workflowsCount} workflow(s)`);
      sendSSEMessage(controller, "progress", {
        step: "workflows",
        status: "success",
        label: "Listing workflows",
        message: `Found ${workflowsCount} workflow${workflowsCount !== 1 ? "s" : ""}`
      });
    }

    // Step 5: List workers
    logger.info("[Setup] Step 5: Listing workers");
    console.log("[Setup] Step 5: Listing workers");
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
      logger.warn("[Setup] Failed to fetch workers");
      console.log("[Setup] Failed to fetch workers");
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
      logger.info(`[Setup] Found ${workersCount} worker(s)`);
      console.log(`[Setup] Found ${workersCount} worker(s)`);
      sendSSEMessage(controller, "progress", {
        step: "workers",
        status: "success",
        label: "Listing workers",
        message: `Found ${workersCount} worker${workersCount !== 1 ? "s" : ""}`
      });
    }

    // Final step: Send completion
    logger.info("[Setup] All checks completed successfully");
    console.log("[Setup] All checks completed successfully");
    sendSSEMessage(controller, "complete", {
      success: true,
      message: "All checks completed successfully"
    });

    controller.close();
  } catch (error) {
    logger.error(
      "Failed to stream setup progress",
      error instanceof Error ? error : new Error(String(error))
    );
    sendSSEMessage(controller, "error", {
      message: error instanceof Error ? error.message : "Unknown error occurred"
    });
    controller.close();
  }
}

const app = new Hono<{ Bindings: Env }>();

// Setup credentials with SSE streaming
app.post("/stream", async c => {
  try {
    logger.info("Setting up Cloudflare credentials with SSE streaming");

    // Validate request body
    const bodyValidation = await validateBody(c, SetupRequestSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }

    const { apiToken, accountId } = bodyValidation.data;

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        await streamSetupProgress(controller, apiToken, accountId);
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    logger.error(
      "Failed to setup SSE stream",
      error instanceof Error ? error : new Error(String(error))
    );
    return c.json(
      {
        success: false,
        error: "Failed to setup SSE stream",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Setup credentials (legacy endpoint, kept for backward compatibility)
app.post("/", async c => {
  try {
    logger.info("Setting up Cloudflare credentials");

    // Validate request body
    const bodyValidation = await validateBody(c, SetupRequestSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }

    const { apiToken, accountId } = bodyValidation.data;

    // Verify credentials with Cloudflare
    logger.info("Verifying Cloudflare credentials");
    const isValid = await verifyCloudflareToken(apiToken, accountId);

    if (!isValid) {
      logger.warn("Invalid Cloudflare credentials provided");
      return c.json(
        {
          success: false,
          error: "Invalid credentials",
          message: "The provided API token or Account ID is invalid",
          code: ErrorCode.AUTHENTICATION_ERROR
        },
        401
      );
    }

    // Encrypt credentials
    const encrypted = await encryptCredentials({ apiToken, accountId });

    // Determine if we're in production
    const isProduction = c.env.ENVIRONMENT === "production";

    // Set cookie with encrypted credentials using Hono cookie helper
    setCookie(c, CREDENTIALS_COOKIE_NAME, encrypted, {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "Lax",
      httpOnly: true,
      secure: isProduction
    });

    logger.info("Cloudflare credentials configured successfully");

    const response: ApiResponse = {
      success: true,
      data: { configured: true },
      message: "Credentials configured successfully"
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error(
      "Failed to setup credentials",
      error instanceof Error ? error : new Error(String(error))
    );
    return c.json(
      {
        success: false,
        error: "Failed to setup credentials",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Logout
app.post("/logout", async c => {
  try {
    const isProduction = c.env.ENVIRONMENT === "production";

    // Delete cookie using Hono cookie helper
    deleteCookie(c, CREDENTIALS_COOKIE_NAME, {
      path: "/",
      secure: isProduction
    });

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
