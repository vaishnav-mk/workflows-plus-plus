import { Hono } from "hono";
import { loggerMiddleware } from "./middleware/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { createWorkflowRoutes } from "./routes/workflows";
import { createNodeRoutes } from "./routes/nodes";
import { createInstanceRoutes } from "./routes/instances";
import { createHealthRoutes } from "./routes/health";
import { createLogStreamRoutes } from "./routes/logStream";
import { createWorkerRoutes } from "./routes/workers";
import { createVersionRoutes } from "./routes/versions";
import { Env } from "./types/env";
import { cors } from "hono/cors";

const app = new Hono<{ Bindings: Env }>();
app.use("*", cors());
app.use("*", loggerMiddleware);

app.route("/health", createHealthRoutes());
app.route("/", createHealthRoutes());

const workflowsApi = new Hono<{ Bindings: Env }>();
workflowsApi.route("/", createWorkflowRoutes());
workflowsApi.route("/", createInstanceRoutes());
workflowsApi.route("/", createLogStreamRoutes());
app.route("/api/workflows", workflowsApi);

app.route("/api/nodes", createNodeRoutes());
app.route("/api/workers", createWorkerRoutes());
app.route("/api/workers", createVersionRoutes());

app.onError(errorHandler);
app.notFound(notFoundHandler);

export default app;
