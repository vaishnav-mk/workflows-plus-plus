/**
 * Credentials Middleware
 * Decrypts Cloudflare credentials from cookie and attaches to request context
 * Returns 401 if credentials are not found or invalid
 */

import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { ErrorCode } from "../../core/enums";
import { logger } from "../../core/logging/logger";
import { ErrorResponse } from "../../core/api-contracts";
import {
  decryptCredentials,
  CloudflareCredentials
} from "../../core/utils/credentials";

const CREDENTIALS_COOKIE_NAME = "cf_credentials";

export interface EnvWithCredentials {
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  [key: string]: unknown;
}

export interface CredentialsContext {
  apiToken: string;
  accountId: string;
}

/**
 * Middleware to extract and decrypt Cloudflare credentials from cookie
 * Falls back to environment variables if no cookie is present
 * Returns 401 if no credentials are found
 */
export const credentialsMiddleware = createMiddleware<{
  Bindings: EnvWithCredentials;
  Variables: {
    credentials: CredentialsContext;
  };
}>(async (c, next) => {
  const startTime = Date.now();
  const env = c.env;

  let credentials: CloudflareCredentials | null = null;

  // Try to get credentials from cookie using Hono cookie helper
  const encryptedCookie = getCookie(c, CREDENTIALS_COOKIE_NAME);

  if (encryptedCookie) {
    try {
      credentials = await decryptCredentials(encryptedCookie);
      logger.debug("Credentials loaded from cookie");
    } catch (error) {
      logger.error(
        "Failed to decrypt credentials cookie",
        error instanceof Error ? error : new Error(String(error)),
        {}
      );
      // Continue to fallback
    }
  }

  // Fallback to environment variables if no cookie
  if (!credentials && env.CF_API_TOKEN && env.CF_ACCOUNT_ID) {
    credentials = {
      apiToken: env.CF_API_TOKEN,
      accountId: env.CF_ACCOUNT_ID
    };
    logger.debug("Credentials loaded from environment variables");
  }

  // If no credentials found, return 401
  if (!credentials) {
    logger.warn("No Cloudflare credentials found", {
      path: c.req.path,
      method: c.req.method,
      hasCookie: !!encryptedCookie,
      hasEnvVars: !!(env.CF_API_TOKEN && env.CF_ACCOUNT_ID)
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Cloudflare credentials required",
      message: "Please configure Cloudflare API token and Account ID",
      code: ErrorCode.AUTHENTICATION_ERROR
    };

    return c.json(errorResponse, 401);
  }

  // Attach credentials to request context
  c.set("credentials", {
    apiToken: credentials.apiToken,
    accountId: credentials.accountId
  });

  const duration = Date.now() - startTime;
  logger.logPerformance("credentials_middleware", duration, {
    path: c.req.path,
    method: c.req.method
  });

  await next();
});
