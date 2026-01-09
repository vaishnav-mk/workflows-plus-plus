import { Hono } from "hono";
import { z } from "zod";
import { HTTP_STATUS_CODES, MESSAGES, CLOUDFLARE } from "../../core/constants";
import { ApiResponse } from "../../types/api";
import { createPaginationResponse } from "../../core/utils/pagination";
import { PaginationQuerySchema } from "../../core/validation/schemas";
import { safe, fetchCloudflare } from "../../core/utils/route-helpers";
import { zValidator } from "../../api/middleware/validation.middleware";
import { rateLimitMiddleware } from "../../api/middleware/rate-limit.middleware";
import { ContextWithCredentials } from "../../types/routes";

const app = new Hono<ContextWithCredentials>();

app.get("/", rateLimitMiddleware(), zValidator('query', PaginationQuerySchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const { page = 1, per_page: perPage = 10 } = c.req.valid('query') as z.infer<typeof PaginationQuerySchema>;

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/ai-search/instances?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
    }
  ) as { result?: Array<{ id: string; created_at: string }>; result_info?: { total_count?: number } };

  const totalCount = data.result_info?.total_count;
  const response = createPaginationResponse(
    data.result || [],
    page,
    perPage,
    totalCount
  );
  response.message = "AI Search instances retrieved successfully";

  return c.json(response, HTTP_STATUS_CODES.OK);
}));

const AISearchIdParamSchema = z.object({
  id: z.string().min(1, "AI Search ID is required")
});

app.get("/:id", rateLimitMiddleware(), zValidator('param', AISearchIdParamSchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const { id } = c.req.valid('param') as z.infer<typeof AISearchIdParamSchema>;

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/ai-search/instances/${id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
    }
  ) as { result?: { id: string } };

  const apiResponse: ApiResponse = {
    success: true,
    data: data.result,
    message: "AI Search instance retrieved successfully",
  };

  return c.json(apiResponse, HTTP_STATUS_CODES.OK);
}));

export default app;
