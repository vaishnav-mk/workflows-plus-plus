import { Hono } from "hono";
import { safe } from "../../core/utils/route-helpers";
import { z } from "zod";
import { zValidator } from "../../api/middleware/validation.middleware";
import { Env, ContextWithCredentials } from "../../types/routes";

const DeploymentIdParamSchema = z.object({
  deploymentId: z.string().min(1, "Deployment ID is required")
});

const app = new Hono<{ Bindings: Env } & ContextWithCredentials>();
app.get(
  "/:deploymentId/stream",
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
