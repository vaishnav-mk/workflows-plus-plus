/**
 * Version Routes
 */

import { Hono } from "hono";
import Cloudflare from "cloudflare";
import { HTTP_STATUS_CODES, MESSAGES } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../core/api-contracts";
import { createPaginationResponse } from "../../core/utils/pagination";
import { CredentialsContext } from "../../api/middleware/credentials.middleware";
import { z } from "zod";
import { validateQuery, validateParams, validationErrorResponse } from "../../core/validation/validator";
import { PaginationQuerySchema, WorkerVersionParamsSchema } from "../../core/validation/schemas";

interface ContextWithCredentials {
  Variables: {
    credentials: CredentialsContext;
  };
}

const app = new Hono<ContextWithCredentials>();

// List worker versions
app.get("/:workerId/versions", async (c) => {
  try {
    // Validate query parameters
    const queryValidation = validateQuery(c, PaginationQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }
    
    // Validate path parameters
    const paramsValidation = validateParams(c, z.object({ workerId: z.string().min(1, "Worker ID is required") }));
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const credentials = c.var.credentials;
    const { workerId } = paramsValidation.data;

    const client = new Cloudflare({
      apiToken: credentials.apiToken,
    });

    const page = queryValidation.data.page || 1;
    const perPage = queryValidation.data.per_page || 10;

    const versions = await client.workers.beta.workers.versions.list(workerId, {
      account_id: credentials.accountId,
      page,
      per_page: perPage,
    });

    const response = createPaginationResponse(
      versions.result || [],
      page,
      perPage
    );
    response.message = MESSAGES.VERSIONS_RETRIEVED;

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to fetch versions",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Get worker version details
app.get("/:workerId/versions/:versionId", async (c) => {
  try {
    // Validate path parameters
    const paramsValidation = validateParams(c, WorkerVersionParamsSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const credentials = c.var.credentials;
    const { workerId, versionId } = paramsValidation.data;

    const client = new Cloudflare({
      apiToken: credentials.apiToken,
    });

    const include = c.req.query("include");
    // Cloudflare API expects "modules" or undefined
    const includeParam = include === "modules" ? "modules" as const : undefined;

    const version = await client.workers.beta.workers.versions.get(
      workerId,
      versionId,
      {
        account_id: credentials.accountId,
        ...(includeParam ? { include: includeParam } : {}),
      }
    );

    const response: ApiResponse = {
      success: true,
      data: version,
      message: MESSAGES.VERSION_RETRIEVED,
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to get version",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;
