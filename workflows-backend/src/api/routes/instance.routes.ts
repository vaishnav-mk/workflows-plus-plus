import { Hono } from "hono";
import { z } from "zod";
import { HTTP_STATUS_CODES, MESSAGES } from "../../core/constants";
import { ApiResponse } from "../../types/api";
import { createPaginationResponse } from "../../core/utils/pagination";
import { LogTailService } from "../../services/logging/log-tail.service";
import { PaginationQuerySchema, WorkflowNameParamSchema, InstanceParamsSchema } from "../../core/validation/schemas";
import { safe } from "../../core/utils/route-helpers";
import { zValidator } from "../../api/middleware/validation.middleware";
import { rateLimitMiddleware } from "../../api/middleware/rate-limit.middleware";
import { ContextWithCredentials, Env } from "../../types/routes";

const app = new Hono<{ Bindings: Env } & ContextWithCredentials>();
app.get("/:workflowName/instances", rateLimitMiddleware(), zValidator('param', WorkflowNameParamSchema), zValidator('query', PaginationQuerySchema), safe(async (c) => {
  const { workflowName } = c.req.valid('param') as z.infer<typeof WorkflowNameParamSchema>;
  const credentials = c.var.credentials;
  const client = c.var.cloudflare;

  const { page = 1, per_page: perPage = 10 } = c.req.valid('query') as z.infer<typeof PaginationQuerySchema>;

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
}));

app.get("/:workflowName/instances/:instanceId", rateLimitMiddleware(), zValidator('param', InstanceParamsSchema), safe(async (c) => {
  const { workflowName, instanceId } = c.req.valid('param') as z.infer<typeof InstanceParamsSchema>;
  const credentials = c.var.credentials;
  const client = c.var.cloudflare;

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
}));

app.get("/:workflowName/instances/:instanceId/logs/tail-url", rateLimitMiddleware(), zValidator('param', InstanceParamsSchema), safe(async (c) => {
  const { workflowName, instanceId } = c.req.valid('param') as z.infer<typeof InstanceParamsSchema>;
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
}));

export default app;
