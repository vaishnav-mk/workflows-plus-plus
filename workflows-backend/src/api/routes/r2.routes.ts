/**
 * R2 Bucket Routes
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

const BucketNameParamSchema = z.object({
  name: z.string().min(1),
});

const CreateBucketSchema = z.object({
  name: z.string().min(1).max(63).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  location: z.string().optional(),
});

const app = new Hono<ContextWithCredentials>();

// List R2 buckets
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
      `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/r2/buckets?${params.toString()}`,
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

    const data = await response.json() as { result?: Array<{ name: string; creation_date?: string; location?: string }>; result_info?: { total_count?: number } };
    
    const totalCount = data.result_info?.total_count;
    const apiResponse = createPaginationResponse(
      data.result || [],
      page,
      perPage,
      totalCount
    );
    apiResponse.message = "R2 buckets retrieved successfully";

    return c.json(apiResponse, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to fetch R2 buckets",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Create R2 bucket
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validation = CreateBucketSchema.safeParse(body);
    
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
    const requestBody: { name: string; location?: string } = {
      name: validation.data.name,
    };
    if (validation.data.location) {
      requestBody.location = validation.data.location;
    }

    const response = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/r2/buckets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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

    const data = await response.json() as { result?: { name: string; creation_date?: string; location?: string } };
    const apiResponse: ApiResponse = {
      success: true,
      data: data.result,
      message: "R2 bucket created successfully",
    };

    return c.json(apiResponse, HTTP_STATUS_CODES.CREATED);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to create R2 bucket",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// List objects in R2 bucket
app.get("/:name/objects", async (c) => {
  try {
    const paramsValidation = validateParams(c, BucketNameParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const credentials = c.var.credentials;
    const { name: bucketName } = paramsValidation.data;
    const prefix = c.req.query("prefix") || "";
    const perPage = Math.min(Math.max(parseInt(c.req.query("per_page") || "25", 10), 1), 1000);

    // Build query parameters
    const params = new URLSearchParams({
      per_page: String(perPage),
    });
    if (prefix) {
      params.append("prefix", prefix);
    }
    const cursor = c.req.query("cursor");
    if (cursor) {
      params.append("cursor", cursor);
    }

    // Use Cloudflare R2 API to list objects directly
    const response = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/r2/buckets/${bucketName}/objects?${params.toString()}`,
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
        error: errorData,
        bucketName,
        prefix,
        perPage
      });
      
      throw new Error(errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    const data = await response.json() as { 
      result?: Array<{
        key: string;
        etag: string;
        last_modified: string;
        size: number;
        http_metadata?: Record<string, string>;
        custom_metadata?: Record<string, string>;
        storage_class?: string;
      }>;
      result_info?: {
        cursor?: string;
        is_truncated?: boolean;
        per_page?: number;
      };
    };

    const objects = data.result || [];
    const resultInfo = data.result_info || {};
    const apiResponse: ApiResponse = {
      success: true,
      data: {
        objects: objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          etag: obj.etag,
          uploaded: obj.last_modified,
          httpMetadata: obj.http_metadata || {},
          customMetadata: obj.custom_metadata || {},
          storageClass: obj.storage_class || "Standard"
        })),
        truncated: resultInfo.is_truncated || false,
        cursor: resultInfo.cursor || null,
        delimitedPrefixes: []
      },
      message: "R2 objects listed successfully",
    };

    return c.json(apiResponse, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to list R2 objects",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;
