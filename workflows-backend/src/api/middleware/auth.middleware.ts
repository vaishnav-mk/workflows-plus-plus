/**
 * Authentication Middleware
 * Validates cookie-based authentication
 * Routes that need Cloudflare credentials should use credentialsMiddleware instead
 */

import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { ErrorCode } from "../../core/enums";
import { logger } from "../../core/logging/logger";
import { ErrorResponse } from "../../core/api-contracts";

const CREDENTIALS_COOKIE_NAME = "cf_credentials";

export interface EnvWithAuth {
  [key: string]: unknown;
}

export async function authMiddleware(
  c: Context<{ Bindings: EnvWithAuth }>,
  next: Next
): Promise<Response | void> {
  const startTime = Date.now();

  // Skip auth for health check and setup routes
  if (
    c.req.path === "/health" ||
    c.req.path === "/" ||
    c.req.path === "/api/setup" ||
    c.req.path.startsWith("/api/setup/")
  ) {
    return next();
  }

  // Skip auth for catalog routes (public endpoint)
  // Catalog doesn't need Cloudflare credentials
  if (c.req.path === "/api/catalog" || c.req.path.startsWith("/api/catalog/")) {
    return next();
  }

  // For other routes, check if cookie exists
  // Routes that need Cloudflare credentials will be validated by credentialsMiddleware
  const cookie = getCookie(c, CREDENTIALS_COOKIE_NAME);

  if (!cookie) {
    logger.warn("Authentication failed: No credentials cookie found", {
      path: c.req.path,
      method: c.req.method
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Authentication required",
      message: "Please configure Cloudflare credentials",
      code: ErrorCode.AUTHENTICATION_ERROR
    };

    return c.json(errorResponse, 401);
  }

  const duration = Date.now() - startTime;
  logger.logPerformance("auth_middleware", duration, {
    path: c.req.path,
    method: c.req.method
  });

  return next();
}
