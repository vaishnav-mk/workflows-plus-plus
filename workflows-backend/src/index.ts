import { Hono } from "hono";
import { cors } from "hono/cors";

import { corsConfig } from "./core/cors.config";
import { loggerMiddleware } from "./api/middleware/logger";
import { errorHandler, notFoundHandler } from "./api/middleware/errorHandler";
import { authMiddleware } from "./api/middleware/auth.middleware";
import {
  credentialsMiddleware
} from "./api/middleware/credentials.middleware";
import { cloudflareMiddleware } from "./api/middleware/cloudflare.middleware";
import { ensureEnv, ensureDeploymentDO } from "./core/utils/route-helpers";

import catalogRoutes from "./api/routes/catalog.routes";
import compilerRoutes from "./api/routes/compiler.routes";
import workflowRoutes from "./api/routes/workflow.routes";
import instanceRoutes from "./api/routes/instance.routes";
import workerRoutes from "./api/routes/worker.routes";
import versionRoutes from "./api/routes/version.routes";
import nodeExecutionRoutes from "./api/routes/node-execution.routes";
import aiWorkflowRoutes from "./api/routes/ai.routes";
import setupRoutes from "./api/routes/setup.routes";
import startersRoutes from "./api/routes/starters.routes";
import deploymentRoutes from "./api/routes/deployment.routes";
import d1Routes from "./api/routes/d1.routes";
import r2Routes from "./api/routes/r2.routes";
import kvRoutes from "./api/routes/kv.routes";

import { DeploymentDurableObject } from "./services/deployment/deployment-durable-object";
import { RateLimitDurableObject } from "./services/rate-limit/rate-limit-durable-object";
import { AppContext } from "./core/types";

const app = new Hono<AppContext>();

app.use("*", cors(corsConfig));

let envChecked = false;

app.use("*", loggerMiddleware);
app.use("*", async (c, next) => {
  if (!envChecked) {
    ensureEnv(c.env, [
      "AI_GATEWAY_URL",
      "AI_GATEWAY_TOKEN",
      "CREDENTIALS_MASTER_KEY"
    ]);
    ensureDeploymentDO(c.env as any);
    envChecked = true;
  }
  await next();
});
app.use("*", authMiddleware);

app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/setup")) return next();
  await credentialsMiddleware(c as any, async () => {
    await cloudflareMiddleware(c as any, next);
  });
});

app.get("/health", c =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);
app.get("/", c =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

app.route("/api/setup", setupRoutes);
app.route("/api/catalog", catalogRoutes);
app.route("/api/compiler", compilerRoutes);
app.route("/api/starters", startersRoutes);

workflowRoutes.route("/", instanceRoutes);
workflowRoutes.route("/", aiWorkflowRoutes);
app.route("/api/workflows", workflowRoutes);

workerRoutes.route("/", versionRoutes);
app.route("/api/workers", workerRoutes);

app.route("/api/nodes", nodeExecutionRoutes);
app.route("/api/deployments", deploymentRoutes);
app.route("/api/d1", d1Routes);
app.route("/api/r2", r2Routes);
app.route("/api/kv", kvRoutes);

app.onError(errorHandler);
app.notFound(notFoundHandler);

export { DeploymentDurableObject, RateLimitDurableObject };

export default app;
