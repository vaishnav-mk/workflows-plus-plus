/**
 * Instance Routes
 */

import { Hono } from "hono";
import Cloudflare from "cloudflare";
import { HTTP_STATUS_CODES, MESSAGES } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../core/api-contracts";
import { createPaginationResponse } from "../../core/utils/pagination";
import { LogTailService } from "../../services/logging/log-tail.service";
import { logger } from "../../core/logging/logger";
import { CredentialsContext } from "../../api/middleware/credentials.middleware";
import { validateQuery, validateParams, validationErrorResponse } from "../../core/validation/validator";
import { PaginationQuerySchema, WorkflowNameParamSchema, InstanceParamsSchema } from "../../core/validation/schemas";

interface Env {
  [key: string]: unknown;
}

interface ContextWithCredentials {
  Variables: {
    credentials: CredentialsContext;
  };
}

const app = new Hono<{ Bindings: Env } & ContextWithCredentials>();

// List instances for a workflow
app.get("/:workflowName/instances", async (c) => {
  try {
    // Validate path parameters
    const paramsValidation = validateParams(c, WorkflowNameParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    // Validate query parameters
    const queryValidation = validateQuery(c, PaginationQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }
    
    const { workflowName } = paramsValidation.data;
    const credentials = c.var.credentials;

    const client = new Cloudflare({
      apiToken: credentials.apiToken
    });

    const page = queryValidation.data.page || 1;
    const perPage = queryValidation.data.per_page || 10;

    const instances = await client.workflows.instances.list(workflowName, {
      account_id: credentials.accountId,
      page,
      per_page: perPage
    });

    const totalCount = (instances.result_info as { total_count?: number })?.total_count;
    const response = createPaginationResponse(
      instances.result || [],
      page,
      perPage,
      totalCount
    );
    response.message = MESSAGES.INSTANCES_RETRIEVED;

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Failed to list instances", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to list instances",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Get instance details
app.get("/:workflowName/instances/:instanceId", async (c) => {
  try {
    // Validate path parameters
    const paramsValidation = validateParams(c, InstanceParamsSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const { workflowName, instanceId } = paramsValidation.data;
    const credentials = c.var.credentials;

    const client = new Cloudflare({
      apiToken: credentials.apiToken
    });

    const instance = await client.workflows.instances.get(
      workflowName,
      instanceId,
      {
        account_id: credentials.accountId
      }
    );
    
    const response: ApiResponse = {
      success: true,
      data: instance,
      message: MESSAGES.INSTANCE_RETRIEVED
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Failed to get instance", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to get instance",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Get log tail URL for instance
app.get("/:workflowName/instances/:instanceId/logs/tail-url", async (c) => {
  try {
    // Validate path parameters
    const paramsValidation = validateParams(c, InstanceParamsSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const { workflowName, instanceId } = paramsValidation.data;
    const credentials = c.var.credentials;

    const logTailService = new LogTailService(credentials.apiToken, credentials.accountId);
    const result = await logTailService.createTailSession({
      workflowName,
      instanceId
    });

    const response: ApiResponse = {
      success: true,
      data: {
        url: result.url,
        expiresAt: result.expiresAt,
        sessionId: result.sessionId
      },
      message: MESSAGES.TAIL_SESSION_CREATED
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Failed to create tail session", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to create tail session",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.LOG_TAIL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;
