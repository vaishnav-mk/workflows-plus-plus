/**
 * KV Namespace Routes
 */

import { Hono } from "hono";
import { HTTP_STATUS_CODES } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../core/api-contracts";
import { createPaginationResponse } from "../../core/utils/pagination";
import { CredentialsContext } from "../../api/middleware/credentials.middleware";
import { validateQuery, validateParams, validationErrorResponse } from "../../core/validation/validator";
import { PaginationQuerySchema } from "../../core/validation/schemas";
import { z } from "zod";
import { CLOUDFLARE } from "../../core/constants";
import { logger } from "../../core/logging/logger";

interface ContextWithCredentials {
  Variables: {
    credentials: CredentialsContext;
  };
}

const NamespaceIdParamSchema = z.object({
  id: z.string(),
});

const CreateNamespaceSchema = z.object({
  title: z.string().min(1).max(100),
});

const app = new Hono<ContextWithCredentials>();

// List KV namespaces
app.get("/", async (c) => {
  try {
    const queryValidation = validateQuery(c, PaginationQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }
    
    const credentials = c.var.credentials;
    const page = queryValidation.data.page || 1;
    const perPage = queryValidation.data.per_page || 1000;

    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });

    const response = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/storage/kv/namespaces?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText) as { message?: string; errors?: Array<{ message?: string }> };
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      
      logger.error("Cloudflare API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    const data = await response.json() as { result?: Array<{ id: string; title: string }>; result_info?: { total_count?: number } };
    const totalCount = data.result_info?.total_count;
    const apiResponse = createPaginationResponse(
      data.result || [],
      page,
      perPage,
      totalCount
    );
    apiResponse.message = "KV namespaces retrieved successfully";

    return c.json(apiResponse, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to fetch KV namespaces",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Get KV namespace by ID
app.get("/:id", async (c) => {
  try {
    const paramsValidation = validateParams(c, NamespaceIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const credentials = c.var.credentials;
    const { id: namespaceId } = paramsValidation.data;

    const response = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/storage/kv/namespaces/${namespaceId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText) as { message?: string; errors?: Array<{ message?: string }> };
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      
      logger.error("Cloudflare API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    const data = await response.json() as { result?: { id: string; title: string } };
    const apiResponse: ApiResponse = {
      success: true,
      data: data.result,
      message: "KV namespace retrieved successfully",
    };

    return c.json(apiResponse, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to get KV namespace",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Create KV namespace
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validation = CreateNamespaceSchema.safeParse(body);
    
    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: validation.error.errors[0]?.message || "Invalid request body",
          code: ErrorCode.VALIDATION_ERROR,
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const credentials = c.var.credentials;
    const response = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/storage/kv/namespaces`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: validation.data.title }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText) as { message?: string; errors?: Array<{ message?: string }> };
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      
      logger.error("Cloudflare API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    const data = await response.json() as { result?: { id: string; title: string } };
    const apiResponse: ApiResponse = {
      success: true,
      data: data.result,
      message: "KV namespace created successfully",
    };

    return c.json(apiResponse, HTTP_STATUS_CODES.CREATED);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to create KV namespace",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;

