import { Context, Next } from "hono";
import { logger } from "../../core/logging/logger";

export const loggerMiddleware = async (
  c: Context,
  next: Next
): Promise<void> => {
  // Only log compiler routes
  const isCompilerRoute = c.req.path.startsWith("/api/compiler");

  if (isCompilerRoute) {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    logger.info(
      `${c.req.method} ${c.req.path} - ${c.res.status} (${duration}ms)`
    );
  } else {
    await next();
  }
};
