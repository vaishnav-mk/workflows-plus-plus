import { createMiddleware } from "hono/factory";
import { ErrorCode } from "../../core/enums";
import { logger } from "../../core/logging/logger";
import { extractCredentialsFromToken } from "../../core/utils/jwt";
import { AppContext, CloudflareCredentials } from "../../core/types";

export const credentialsMiddleware = createMiddleware<
  AppContext
>(async (c, next) => {
  const startTime = Date.now();
  const env = c.env;
  let credentials: CloudflareCredentials | null = null;

  const authHeader = c.req.header("Authorization");
  const url = new URL(c.req.url);
  const tokenFromQuery = url.searchParams.get("token");
  const token = authHeader?.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : tokenFromQuery;

  if (token && env.CREDENTIALS_MASTER_KEY) {
    try {
      credentials = await extractCredentialsFromToken(
        token,
        env.CREDENTIALS_MASTER_KEY
      );
      logger.debug("credentials loaded from jwt token", { 
        source: authHeader ? "header" : "query" 
      });
    } catch (error) {
      logger.error("failed to extract credentials from token", error as Error);
    }
  }

  if (
    !credentials &&
    typeof env.CF_API_TOKEN === "string" &&
    typeof env.CF_ACCOUNT_ID === "string"
  ) {
    credentials = {
      apiToken: env.CF_API_TOKEN,
      accountId: env.CF_ACCOUNT_ID
    };
    logger.debug("credentials loaded from env");
  }

  if (!credentials) {
    logger.warn("no credentials found", { path: c.req.path });
    return c.json(
      {
        success: false,
        error: "cloudflare credentials required",
        message: "please configure cloudflare api token and account id",
        code: ErrorCode.AUTHENTICATION_ERROR
      },
      401
    );
  }

  c.set("credentials", credentials);

  logger.logPerformance("credentials_middleware", Date.now() - startTime, {
    path: c.req.path
  });

  await next();
});
