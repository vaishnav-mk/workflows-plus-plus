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
    const deploymentDO = c.env.DEPLOYMENT_DO!;
    const kv = c.env.WORKFLOWS_KV;
    const deployments: Array<{
      id: string;
      workflowId: string;
      name: string;
      status: string;
      startedAt?: string;
      completedAt?: string;
    }> = [];

    try {
      const deploymentsList = await kv.list({ prefix: "deployment:" });
      
      for (const key of deploymentsList.keys) {
        const deploymentId = key.name.replace("deployment:", "");
        const id = deploymentDO.idFromName(deploymentId);
        const instance = deploymentDO.get(id);
        
        try {
          const response = await instance.fetch(new Request("http://internal/status"));
          const data = await response.json() as any;
          
          if (data.success && data.data) {
            deployments.push({
              id: data.data.deploymentId || deploymentId,
              workflowId: data.data.workflowId || deploymentId,
              name: data.data.workflowId || deploymentId,
              status: data.data.status || "unknown",
              startedAt: data.data.startedAt,
              completedAt: data.data.completedAt
            });
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      console.error("Failed to list deployments:", error);
    }

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
