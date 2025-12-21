import { createMiddleware } from "hono/factory";
import { ErrorCode } from "../../core/enums";
import { HTTP_STATUS_CODES, RATE_LIMIT } from "../../core/constants";
import { logger } from "../../core/logging/logger";
import { AppContext } from "../../core/types";
import { inferCallType } from "../../core/utils/rate-limit-infer";

interface RateLimitOptions {
  callType?: string;
  limit?: number;
}

export const rateLimitMiddleware = (options: RateLimitOptions = {}) => {
  return createMiddleware<AppContext>(async (c, next) => {
    const env = c.env;
    const credentials = c.var.credentials;

    if (!credentials?.accountId) {
      return next();
    }

    if (!env.RATE_LIMIT_DO) {
      logger.warn("Rate limit DO not configured, skipping rate limiting");
      return next();
    }

    const inferredCallType = options.callType || inferCallType(c.req.method, c.req.path);
    
    if (!inferredCallType) {
      return next();
    }

    const callType = inferredCallType;
    const limit = options.limit || RATE_LIMIT.LIMITS[callType as keyof typeof RATE_LIMIT.LIMITS] || 100;

    const rateLimitDO = env.RATE_LIMIT_DO as DurableObjectNamespace;
    const doId = rateLimitDO.idFromName(`ratelimit:${credentials.accountId}`);
    const doInstance = rateLimitDO.get(doId);

    const checkRequest = new Request(`${new URL(c.req.url).origin}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: credentials.accountId,
        callType,
        limit,
        windowMs: RATE_LIMIT.WINDOW_MS
      })
    });

    try {
      const response = await doInstance.fetch(checkRequest);
      const result = await response.json() as {
        allowed: boolean;
        remaining: number;
        resetAt: number;
        limit: number;
      };

      if (!result.allowed) {
        const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000);
        return c.json(
          {
            success: false,
            error: "Rate limit exceeded",
            message: `Rate limit exceeded for ${callType}. Limit: ${result.limit} requests per minute. Try again in ${resetIn} seconds.`,
            code: ErrorCode.RATE_LIMIT_EXCEEDED
          },
          HTTP_STATUS_CODES.BAD_REQUEST
        );
      }

      c.header("X-RateLimit-Limit", String(result.limit));
      c.header("X-RateLimit-Remaining", String(result.remaining));
      c.header("X-RateLimit-Reset", String(result.resetAt));

      return next();
    } catch (error) {
      logger.error("Rate limit check failed", error instanceof Error ? error : new Error(String(error)));
      return next();
    }
  });
};

