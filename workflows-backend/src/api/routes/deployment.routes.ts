/**
 * deployment routes sse
 */

import { Hono } from "hono";
import { CredentialsContext } from "../../core/types";
import { safe } from "../../core/utils/route-helpers";
import { z } from "zod";
import { zValidator } from "../../api/middleware/validation.middleware";

interface Env {
  DEPLOYMENT_DO?: DurableObjectNamespace;
  [key: string]: unknown;
}

interface ContextWithCredentials {
  Variables: {
    credentials: CredentialsContext;
  };
}

const DeploymentIdParamSchema = z.object({
  deploymentId: z.string().min(1, "Deployment ID is required")
});

const app = new Hono<{ Bindings: Env } & ContextWithCredentials>();

// stream deployment progress
app.get(
  "/:deploymentId/stream",
  zValidator("param", DeploymentIdParamSchema),
  safe(async c => {
    const { deploymentId } = c.req.valid("param") as z.infer<
      typeof DeploymentIdParamSchema
    >;

    const deploymentDO = c.env.DEPLOYMENT_DO!;

    // Get or create Durable Object instance for this deployment
    const id = deploymentDO.idFromName(deploymentId);
    const deploymentDOInstance = deploymentDO.get(id);

    // Forward SSE request to Durable Object
    const baseUrl = new URL(c.req.url);
    const doUrl = `${baseUrl.origin}/stream`;
    const headers = new Headers();
    c.req.raw.headers.forEach((value, key) => {
      headers.set(key, value);
    });
    headers.set("accept", "text/event-stream");
    const request = new Request(doUrl, {
      method: "GET",
      headers
    });

    return deploymentDOInstance.fetch(request);
  })
);

// get deployment status
app.get(
  "/:deploymentId/status",
  zValidator("param", DeploymentIdParamSchema),
  safe(async c => {
    const { deploymentId } = c.req.valid("param") as z.infer<
      typeof DeploymentIdParamSchema
    >;

    const deploymentDO = c.env.DEPLOYMENT_DO!;

    // Get Durable Object instance for this deployment
    const id = deploymentDO.idFromName(deploymentId);
    const deploymentDOInstance = deploymentDO.get(id);

    // Forward status request to Durable Object
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
