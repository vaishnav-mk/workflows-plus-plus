/**
 * Deployment Routes
 * Handles deployment progress streaming via SSE
 */

import { Hono } from "hono";
import { HTTP_STATUS_CODES } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { logger } from "../../core/logging/logger";
import { CredentialsContext } from "../../api/middleware/credentials.middleware";

interface Env {
  DEPLOYMENT_DO?: DurableObjectNamespace;
  [key: string]: unknown;
}

interface ContextWithCredentials {
  Variables: {
    credentials: CredentialsContext;
  };
}

const app = new Hono<{ Bindings: Env } & ContextWithCredentials>();

// Stream deployment progress via SSE
app.get("/:deploymentId/stream", async c => {
  try {
    const deploymentId = c.req.param("deploymentId");
    if (!deploymentId) {
      return c.json(
        {
          success: false,
          error: "Deployment ID is required"
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const env = c.env;
    if (!env.DEPLOYMENT_DO) {
      logger.error("DEPLOYMENT_DO binding not configured");
      return c.json(
        {
          success: false,
          error: "Deployment Durable Object not configured"
        },
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }

    // Get or create Durable Object instance for this deployment
    const id = env.DEPLOYMENT_DO.idFromName(deploymentId);
    const deploymentDO = env.DEPLOYMENT_DO.get(id);

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

    return deploymentDO.fetch(request);
  } catch (error) {
    logger.error(
      "Failed to stream deployment progress",
      error instanceof Error ? error : new Error(String(error))
    );
    return c.json(
      {
        success: false,
        error: "Failed to stream deployment progress",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Get deployment status
app.get("/:deploymentId/status", async c => {
  try {
    const deploymentId = c.req.param("deploymentId");
    if (!deploymentId) {
      return c.json(
        {
          success: false,
          error: "Deployment ID is required"
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const env = c.env;
    if (!env.DEPLOYMENT_DO) {
      logger.error("DEPLOYMENT_DO binding not configured");
      return c.json(
        {
          success: false,
          error: "Deployment Durable Object not configured"
        },
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }

    // Get Durable Object instance for this deployment
    const id = env.DEPLOYMENT_DO.idFromName(deploymentId);
    const deploymentDO = env.DEPLOYMENT_DO.get(id);

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

    return deploymentDO.fetch(request);
  } catch (error) {
    logger.error(
      "Failed to get deployment status",
      error instanceof Error ? error : new Error(String(error))
    );
    return c.json(
      {
        success: false,
        error: "Failed to get deployment status",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;
