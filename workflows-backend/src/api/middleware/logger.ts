import { Context, Next } from "hono";
import { logger } from "../../core/logging/logger";

export const loggerMiddleware = async (
  c: Context,
  next: Next
): Promise<void> => {
  if (!c.req.path.startsWith("/api/compiler")) {
    return next();
  }

  const start = Date.now();
  await next();
  logger.info(
    `${c.req.method} ${c.req.path} - ${c.res.status} (${Date.now() - start}ms)`
  );
};
