import { Hono } from "hono";
import { z } from "zod";
import { HTTP_STATUS_CODES, MESSAGES } from "../../core/constants";
import { ApiResponse } from "../../types/api";
import { createPaginationResponse } from "../../core/utils/pagination";
import { PaginationQuerySchema, WorkerIdParamSchema } from "../../core/validation/schemas";
import { safe } from "../../core/utils/route-helpers";
import { zValidator } from "../../api/middleware/validation.middleware";
import { rateLimitMiddleware } from "../../api/middleware/rate-limit.middleware";
import { ContextWithCredentials } from "../../types/routes";

const app = new Hono<ContextWithCredentials>();
app.get("/", rateLimitMiddleware(), zValidator('query', PaginationQuerySchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const client = c.var.cloudflare;

  const { page = 1, per_page: perPage = 10 } = c.req.valid('query') as z.infer<typeof PaginationQuerySchema>;

  const workers = await client.workers.beta.workers.list({
    account_id: credentials.accountId,
    page,
    per_page: perPage,
  });

  const workersList = workers.result || [];
  
  const sortedWorkers = workersList.sort((a: any, b: any) => {
    const dateA = new Date(a.created_on || 0).getTime();
    const dateB = new Date(b.created_on || 0).getTime();
    return dateB - dateA;
  });

  const totalCount = (workers.result_info as { total_count?: number })?.total_count;
  const response = createPaginationResponse(
    sortedWorkers,
    page,
    perPage,
    totalCount
  );
  response.message = MESSAGES.WORKERS_RETRIEVED;

  return c.json(response, HTTP_STATUS_CODES.OK);
}));

app.get("/:id", rateLimitMiddleware(), zValidator('param', WorkerIdParamSchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const { id: workerId } = c.req.valid('param') as z.infer<typeof WorkerIdParamSchema>;
  const client = c.var.cloudflare;

  const worker = await client.workers.beta.workers.get(workerId, {
    account_id: credentials.accountId,
  });

  const response: ApiResponse = {
    success: true,
    data: worker,
    message: MESSAGES.WORKER_RETRIEVED,
  };

  return c.json(response, HTTP_STATUS_CODES.OK);
}));

export default app;
