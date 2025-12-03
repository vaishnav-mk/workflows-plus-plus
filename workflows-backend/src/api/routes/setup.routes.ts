/**
 * Setup Routes
 * Handles credential setup and logout
 */

import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { HTTP_STATUS_CODES, CLOUDFLARE } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../core/api-contracts";
import { logger } from "../../core/logging/logger";
import { encryptCredentials } from "../../core/utils/credentials";
import {
  validateBody,
  validationErrorResponse
} from "../../core/validation/validator";
import { SetupRequestSchema } from "../../core/validation/schemas";

const CREDENTIALS_COOKIE_NAME = "cf_credentials";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

interface Env {
  ENVIRONMENT?: string;
  [key: string]: unknown;
}

/**
 * Verify Cloudflare API token by calling the verify endpoint
 */
async function verifyCloudflareToken(
  apiToken: string,
  accountId: string
): Promise<boolean> {
  try {
    const verifyUrl = `${CLOUDFLARE.API_BASE}/accounts/${accountId}/tokens/verify`;

    const response = await fetch(verifyUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      }
    });

    return response.ok;
  } catch (error) {
    logger.error(
      "Failed to verify Cloudflare token",
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

const app = new Hono<{ Bindings: Env }>();

// Setup credentials
app.post("/", async c => {
  try {
    logger.info("Setting up Cloudflare credentials");

    // Validate request body
    const bodyValidation = await validateBody(c, SetupRequestSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }

    const { apiToken, accountId } = bodyValidation.data;

    // Verify credentials with Cloudflare
    logger.info("Verifying Cloudflare credentials");
    const isValid = await verifyCloudflareToken(apiToken, accountId);

    if (!isValid) {
      logger.warn("Invalid Cloudflare credentials provided");
      return c.json(
        {
          success: false,
          error: "Invalid credentials",
          message: "The provided API token or Account ID is invalid",
          code: ErrorCode.AUTHENTICATION_ERROR
        },
        401
      );
    }

    // Encrypt credentials
    const encrypted = await encryptCredentials({ apiToken, accountId });

    // Determine if we're in production
    const isProduction = c.env.ENVIRONMENT === "production";

    // Set cookie with encrypted credentials using Hono cookie helper
    setCookie(c, CREDENTIALS_COOKIE_NAME, encrypted, {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "Lax",
      httpOnly: true,
      secure: isProduction
    });

    logger.info("Cloudflare credentials configured successfully");

    const response: ApiResponse = {
      success: true,
      data: { configured: true },
      message: "Credentials configured successfully"
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error(
      "Failed to setup credentials",
      error instanceof Error ? error : new Error(String(error))
    );
    return c.json(
      {
        success: false,
        error: "Failed to setup credentials",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Logout
app.post("/logout", async c => {
  try {
    const isProduction = c.env.ENVIRONMENT === "production";

    // Delete cookie using Hono cookie helper
    deleteCookie(c, CREDENTIALS_COOKIE_NAME, {
      path: "/",
      secure: isProduction
    });

    const response: ApiResponse = {
      success: true,
      data: { loggedOut: true },
      message: "Logged out successfully"
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error(
      "Failed to logout",
      error instanceof Error ? error : new Error(String(error))
    );
    return c.json(
      {
        success: false,
        error: "Failed to logout",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;
