import { Hono } from "hono";
import { safe } from "../../core/utils/route-helpers";
import { z } from "zod";
import { zValidator } from "../../api/middleware/validation.middleware";
import { rateLimitMiddleware } from "../../api/middleware/rate-limit.middleware";
import { Env, ContextWithCredentials } from "../../types/routes";
import { HTTP_STATUS_CODES } from "../../core/constants";

const DeploymentIdParamSchema = z.object({
  deploymentId: z.string().min(1, "Deployment ID is required")
});

const app = new Hono<{ Bindings: Env } & ContextWithCredentials>();

app.get(
  "/",
  rateLimitMiddleware(),
  safe(async c => {
    const client = c.var.cloudflare;
    const credentials = c.var.credentials;

    const workers = await client.workers.scripts.list({
      account_id: credentials.accountId
    });

    const deployments = (workers.result || [])
      .filter((worker: any) => worker.id?.includes("workflow") || worker.id?.includes("deployment"))
      .map((worker: any) => {
        const deploymentId = worker.id?.startsWith("workflow-") 
          ? worker.id.replace("workflow-", "deployment-")
          : worker.id?.startsWith("deployment-") 
            ? worker.id 
            : `deployment-${worker.id}`;
        
        return {
          id: deploymentId,
          workflowId: worker.id,
          name: worker.id,
          createdAt: worker.created_on,
          updatedAt: worker.modified_on
        };
      });

    return c.json({
      success: true,
      data: deployments,
      message: "Deployments retrieved successfully"
    }, HTTP_STATUS_CODES.OK);
  })
);
app.get(
  "/:deploymentId/stream",
  rateLimitMiddleware(),
  zValidator("param", DeploymentIdParamSchema),
  safe(async c => {
    const { deploymentId } = c.req.valid("param") as z.infer<
      typeof DeploymentIdParamSchema
    >;

    const deploymentDO = c.env.DEPLOYMENT_DO!;

    const id = deploymentDO.idFromName(deploymentId);
    const deploymentDOInstance = deploymentDO.get(id);
    const baseUrl = new URL(c.req.url);
    const doUrl = `${baseUrl.origin}/stream`;
    const headers = new Headers();
    c.req.raw.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    const url = new URL(c.req.url);
    const tokenFromQuery = url.searchParams.get("token");
    if (tokenFromQuery && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${tokenFromQuery}`);
    }

    headers.set("accept", "text/event-stream");
    const request = new Request(doUrl, {
      method: "GET",
      headers
    });

    return deploymentDOInstance.fetch(request);
  })
);

app.get(
  "/:deploymentId/status",
  rateLimitMiddleware(),
  zValidator("param", DeploymentIdParamSchema),
  safe(async c => {
    const { deploymentId } = c.req.valid("param") as z.infer<
      typeof DeploymentIdParamSchema
    >;

    const deploymentDO = c.env.DEPLOYMENT_DO!;

    const id = deploymentDO.idFromName(deploymentId);
    const deploymentDOInstance = deploymentDO.get(id);
    const baseUrl = new URL(c.req.url);
    const doUrl = `${baseUrl.origin}/status`;
    const headers = new Headers();
    c.req.raw.headers.forEach((value, key) => {
      headers.set(key, value);
    });
    const request = new Request(doUrl, {
      method: "GET",
      headers
    });

    return deploymentDOInstance.fetch(request);
  })
);

export default app;
