import { Hono } from "hono";
import { HTTP_STATUS_CODES, CLOUDFLARE } from "../../core/constants";
import { ApiResponse } from "../../types/api";
import { safe, fetchCloudflare } from "../../core/utils/route-helpers";
import { rateLimitMiddleware } from "../../api/middleware/rate-limit.middleware";
import { ContextWithCredentials } from "../../types/routes";

const app = new Hono<ContextWithCredentials>();

app.get("/search", rateLimitMiddleware(), safe(async (c) => {
  const credentials = c.var.credentials;

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/ai/models/search?page=1&per_page=1000`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json"
      }
    }
  ) as { result?: Array<{ name: string }> };

  const models = (data.result || []).map(model => ({ name: model.name }));

  const apiResponse: ApiResponse = {
    success: true,
    data: models,
    message: "AI models retrieved successfully",
  };

  return c.json(apiResponse, HTTP_STATUS_CODES.OK);
}));

export default app;
