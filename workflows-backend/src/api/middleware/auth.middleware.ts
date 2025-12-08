import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { ErrorCode } from "../../core/enums";
import { logger } from "../../core/logging/logger";
import { PUBLIC_ROUTES, PUBLIC_ROUTE_PREFIXES } from "../../core/constants";
import { AppContext } from "../../core/types";

const CREDENTIALS_COOKIE_NAME = "cf_credentials";

export async function authMiddleware(
  c: Context<AppContext>,
  next: Next
): Promise<Response | void> {
  const path = c.req.path;

  if (
    PUBLIC_ROUTES.includes(path as any) ||
    PUBLIC_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix))
  ) {
    return next();
  }

  const cookie = getCookie(c, CREDENTIALS_COOKIE_NAME);

  if (!cookie) {
    logger.warn("authentication failed: no cookie", {
      path,
      method: c.req.method
    });
    return c.json(
      {
        success: false,
        error: "authentication required",
        message: "please configure cloudflare credentials",
        code: ErrorCode.AUTHENTICATION_ERROR
      },
      401
    );
  }

  logger.logPerformance("auth_middleware", 0, { path, method: c.req.method });
  return next();
}
