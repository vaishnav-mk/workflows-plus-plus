/**
 * Worker Routes
 */

import { Hono } from "hono";
import Cloudflare from "cloudflare";
import { HTTP_STATUS_CODES, MESSAGES } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../core/api-contracts";
import { createPaginationResponse } from "../../core/utils/pagination";
import { CredentialsContext } from "../../api/middleware/credentials.middleware";
import { validateQuery, validateParams, validationErrorResponse } from "../../core/validation/validator";
import { PaginationQuerySchema, WorkerIdParamSchema } from "../../core/validation/schemas";

interface ContextWithCredentials {
  Variables: {
    credentials: CredentialsContext;
  };
}

const app = new Hono<ContextWithCredentials>();

// List workers
app.get("/", async (c) => {
  try {
    // Validate query parameters
    const queryValidation = validateQuery(c, PaginationQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }
    
    const credentials = c.var.credentials;
    const client = new Cloudflare({
      apiToken: credentials.apiToken,
    });

    const page = queryValidation.data.page || 1;
    const perPage = queryValidation.data.per_page || 10;

    const workers = await client.workers.beta.workers.list({
      account_id: credentials.accountId,
      page,
      per_page: perPage,
    });

    const totalCount = (workers.result_info as { total_count?: number })?.total_count;
    const response = createPaginationResponse(
      workers.result || [],
      page,
      perPage,
      totalCount
    );
    response.message = MESSAGES.WORKERS_RETRIEVED;

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to fetch workers",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Get worker details
app.get("/:id", async (c) => {
  try {
    // Validate path parameters
    const paramsValidation = validateParams(c, WorkerIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const credentials = c.var.credentials;
    const { id: workerId } = paramsValidation.data;

    const client = new Cloudflare({
      apiToken: credentials.apiToken,
    });

    const worker = await client.workers.beta.workers.get(workerId, {
      account_id: credentials.accountId,
    });

    const response: ApiResponse = {
      success: true,
      data: worker,
      message: MESSAGES.WORKER_RETRIEVED,
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to get worker",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;
