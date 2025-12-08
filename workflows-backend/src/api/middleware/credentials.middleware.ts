import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { ErrorCode } from "../../core/enums";
import { logger } from "../../core/logging/logger";
import { decryptCredentials } from "../../core/utils/credentials";
import { AppContext, CloudflareCredentials } from "../../core/types";

const CREDENTIALS_COOKIE_NAME = "cf_credentials";

export const credentialsMiddleware = createMiddleware<
  AppContext
>(async (c, next) => {
  const startTime = Date.now();
  const env = c.env;
  let credentials: CloudflareCredentials | null = null;

  const encryptedCookie = getCookie(c, CREDENTIALS_COOKIE_NAME);

  if (encryptedCookie && env.CREDENTIALS_MASTER_KEY) {
    try {
      credentials = await decryptCredentials(
        encryptedCookie,
        env.CREDENTIALS_MASTER_KEY
      );
      logger.debug("credentials loaded from cookie");
    } catch (error) {
      logger.error("failed to decrypt credentials", error as Error);
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
