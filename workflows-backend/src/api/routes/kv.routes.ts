import { Hono } from "hono";
import { HTTP_STATUS_CODES, CLOUDFLARE } from "../../core/constants";
import { ApiResponse } from "../../types/api";
import { createPaginationResponse } from "../../core/utils/pagination";
import { PaginationQuerySchema } from "../../core/validation/schemas";
import { z } from "zod";
import { safe } from "../../core/utils/route-helpers";
import { zValidator } from "../../api/middleware/validation.middleware";
import { ContextWithCredentials } from "../../types/routes";

const NamespaceIdParamSchema = z.object({
  id: z.string(),
});

const CreateNamespaceSchema = z.object({
  title: z.string().min(1).max(100),
});

const app = new Hono<ContextWithCredentials>();

async function fetchCloudflare(url: string, options: RequestInit) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
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
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/storage/kv/namespaces?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
    }
  ) as { result?: Array<{ id: string; title: string }>; result_info?: { total_count?: number } };

  const totalCount = data.result_info?.total_count;
  const apiResponse = createPaginationResponse(
    data.result || [],
    page,
    perPage,
    totalCount
  );
  apiResponse.message = "KV namespaces retrieved successfully";

  return c.json(apiResponse, HTTP_STATUS_CODES.OK);
}));

app.get("/:id", zValidator('param', NamespaceIdParamSchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const { id: namespaceId } = c.req.valid('param') as z.infer<typeof NamespaceIdParamSchema>;

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/storage/kv/namespaces/${namespaceId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
    }
  ) as { result?: { id: string; title: string } };

  const apiResponse: ApiResponse = {
    success: true,
    data: data.result,
    message: "KV namespace retrieved successfully",
  };

  return c.json(apiResponse, HTTP_STATUS_CODES.OK);
}));

app.post("/", zValidator('json', CreateNamespaceSchema), safe(async (c) => {
  const { title } = c.req.valid('json') as z.infer<typeof CreateNamespaceSchema>;
  const credentials = c.var.credentials;

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/storage/kv/namespaces`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    }
  ) as { result?: { id: string; title: string } };

  const apiResponse: ApiResponse = {
    success: true,
    data: data.result,
    message: "KV namespace created successfully",
  };

  return c.json(apiResponse, HTTP_STATUS_CODES.CREATED);
}));

export default app;
