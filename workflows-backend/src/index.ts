/**
 * Main Application Entry Point
 * New Architecture - Split-Brain Design
 * 
 * Only exposes:
 * - /api/catalog - Discovery (node catalog)
 * - /api/compiler - Compilation (workflow compilation)
 */

import { Hono } from "hono";
import { loggerMiddleware } from "./api/middleware/logger";
import { errorHandler, notFoundHandler } from "./api/middleware/errorHandler";
import { authMiddleware } from "./api/middleware/auth.middleware";
import {
  credentialsMiddleware,
  CredentialsContext,
  EnvWithCredentials
} from "./api/middleware/credentials.middleware";
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
import { DeploymentDurableObject } from "./services/deployment/deployment-durable-object";
import { cors } from "hono/cors";

// Environment types for Cloudflare Workers
interface Env extends EnvWithCredentials {
  DB?: D1Database;
  ENVIRONMENT?: string;
  AI_GATEWAY_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  [key: string]: unknown;
}

const app = new Hono<{
  Bindings: Env;
  Variables: { credentials?: CredentialsContext };
}>();

// CORS configuration - restrict to specific origins in production
app.use(
  "*",
  cors({
    origin: origin => {
      // In development, allow all origins
      // In production, specify allowed origins
      return origin || "*";
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

// Logging middleware (applied to all routes)
app.use("*", loggerMiddleware);

// Authentication middleware (applied to all routes except health and setup)
app.use("*", authMiddleware);

// Credentials middleware (applied to protected routes that need Cloudflare credentials)
// This runs after auth but before route handlers
app.use("/api/*", async (c, next) => {
  // Skip credentials check for setup routes
  if (c.req.path === "/api/setup" || c.req.path.startsWith("/api/setup/")) {
    return next();
  }
  // Type assertion needed because middleware expects specific context type
  return credentialsMiddleware(
    c as Parameters<typeof credentialsMiddleware>[0],
    next
  );
});

// Health check
app.get("/health", c =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);
app.get("/", c =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

// Setup routes (no credentials required)
app.route("/api/setup", setupRoutes);

// New Architecture Routes
app.route("/api/catalog", catalogRoutes);
app.route("/api/compiler", compilerRoutes);
app.route("/api/starters", startersRoutes);

// Workflow Management Routes
workflowRoutes.route("/", instanceRoutes);
workflowRoutes.route("/", aiWorkflowRoutes);
app.route("/api/workflows", workflowRoutes);

// Worker Management Routes
workerRoutes.route("/", versionRoutes);
app.route("/api/workers", workerRoutes);

// Node Execution Routes
app.route("/api/nodes", nodeExecutionRoutes);

// Deployment Routes (SSE streaming)
app.route("/api/deployments", deploymentRoutes);

app.onError(errorHandler);
app.notFound(notFoundHandler);

// Export Durable Object class for Cloudflare Workers
export { DeploymentDurableObject };

export default app;
