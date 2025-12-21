import { Hono } from "hono";
import { HTTP_STATUS_CODES } from "../../core/constants";
import { ApiResponse } from "../../types/api";
import { createPaginationResponse } from "../../core/utils/pagination";
import { PaginationQuerySchema } from "../../core/validation/schemas";
import { z } from "zod";
import { CLOUDFLARE } from "../../core/constants";
import { safe } from "../../core/utils/route-helpers";
import { zValidator } from "../../api/middleware/validation.middleware";
import { ContextWithCredentials } from "../../types/routes";

const BucketNameParamSchema = z.object({
  name: z.string().min(1),
});

const CreateBucketSchema = z.object({
  name: z.string().min(1).max(63).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  location: z.string().optional(),
});

const app = new Hono<ContextWithCredentials>();

async function fetchCloudflare(url: string, options: RequestInit) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: { message?: string; errors?: Array<{ message?: string; code?: number }> } = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || `HTTP ${response.status}` };
    }
    
    throw new Error(`${response.status} ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

app.get("/", zValidator('query', PaginationQuerySchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const { page = 1, per_page: perPage = 1000 } = c.req.valid('query') as z.infer<typeof PaginationQuerySchema>;

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/r2/buckets?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
    }
  ) as { result?: Array<{ name: string; creation_date?: string; location?: string }>; result_info?: { total_count?: number } };
  
  const totalCount = data.result_info?.total_count;
  const apiResponse = createPaginationResponse(
    data.result || [],
    page,
    perPage,
    totalCount
  );
  apiResponse.message = "R2 buckets retrieved successfully";

  return c.json(apiResponse, HTTP_STATUS_CODES.OK);
}));

app.post("/", zValidator('json', CreateBucketSchema), safe(async (c) => {
  const { name, location } = c.req.valid('json') as z.infer<typeof CreateBucketSchema>;
  const credentials = c.var.credentials;
  
  const requestBody: { name: string; location?: string } = {
    name,
  };
  if (location) {
    requestBody.location = location;
  }

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/r2/buckets`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  ) as { result?: { name: string; creation_date?: string; location?: string } };

  const apiResponse: ApiResponse = {
    success: true,
    data: data.result,
    message: "R2 bucket created successfully",
  };

  return c.json(apiResponse, HTTP_STATUS_CODES.CREATED);
}));

app.get("/:name/objects", zValidator('param', BucketNameParamSchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const { name: bucketName } = c.req.valid('param') as z.infer<typeof BucketNameParamSchema>;
  
  const prefix = c.req.query("prefix") || "";
  const perPage = Math.min(Math.max(parseInt(c.req.query("per_page") || "25", 10), 1), 1000);

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

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/r2/buckets/${bucketName}/objects?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
    }
  ) as { 
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
}));

export default app;
