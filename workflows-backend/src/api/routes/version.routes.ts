/**
 * Version Routes
 */

import { Hono } from "hono";
import { HTTP_STATUS_CODES, MESSAGES } from "../../core/constants";
import { ApiResponse } from "../../core/api-contracts";
import { createPaginationResponse } from "../../core/utils/pagination";
import { CredentialsContext } from "../../core/types";
import { z } from "zod";
import { PaginationQuerySchema, WorkerVersionParamsSchema } from "../../core/validation/schemas";
import { safe } from "../../core/utils/route-helpers";
import { zValidator } from "../../api/middleware/validation.middleware";
import { CloudflareContext } from "../../core/types";

interface ContextWithCredentials {
  Variables: {
    credentials: CredentialsContext;
  } & CloudflareContext;
}

const app = new Hono<ContextWithCredentials>();

const WorkerIdParamSchema = z.object({ workerId: z.string().min(1, "Worker ID is required") });

// List worker versions
app.get("/:workerId/versions", 
  zValidator('param', WorkerIdParamSchema), 
  zValidator('query', PaginationQuerySchema), 
  safe(async (c) => {
    const credentials = c.var.credentials;
    const { workerId } = c.req.valid('param') as z.infer<typeof WorkerIdParamSchema>;
    const client = c.var.cloudflare;

    const { page = 1, per_page: perPage = 10 } = c.req.valid('query') as z.infer<typeof PaginationQuerySchema>;

    const versions = await client.workers.beta.workers.versions.list(workerId, {
      account_id: credentials.accountId,
      page,
      per_page: perPage,
    });

    const response = createPaginationResponse(
      versions.result || [],
      page,
      perPage
    );
    response.message = MESSAGES.VERSIONS_RETRIEVED;

    return c.json(response, HTTP_STATUS_CODES.OK);
  })
);

// Get worker version details
app.get("/:workerId/versions/:versionId", 
  zValidator('param', WorkerVersionParamsSchema), 
  safe(async (c) => {
    const credentials = c.var.credentials;
    const { workerId, versionId } = c.req.valid('param') as z.infer<typeof WorkerVersionParamsSchema>;
    const client = c.var.cloudflare;

    const include = c.req.query("include");
    // Cloudflare API expects "modules" or undefined
    const includeParam = include === "modules" ? "modules" as const : undefined;

    const version = await client.workers.beta.workers.versions.get(
      workerId,
      versionId,
      {
        account_id: credentials.accountId,
        ...(includeParam ? { include: includeParam } : {}),
      }
    );

    const response: ApiResponse = {
      success: true,
      data: version,
      message: MESSAGES.VERSION_RETRIEVED,
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  })
);

export default app;
