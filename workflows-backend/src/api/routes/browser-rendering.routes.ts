/**
 * Browser Rendering Routes
 * Proxies requests to Cloudflare Browser Rendering API
 */

import { Hono } from "hono";
import { HTTP_STATUS_CODES } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { CredentialsContext } from "../../api/middleware/credentials.middleware";
import { validateQuery, validateParams, validationErrorResponse } from "../../core/validation/validator";
import { z } from "zod";
import { CLOUDFLARE } from "../../core/constants";
import { logger } from "../../core/logging/logger";

interface ContextWithCredentials {
  Variables: {
    credentials: CredentialsContext;
  };
}

const AccountIdParamSchema = z.object({
  account_id: z.string().min(1),
});

const CacheTTLQuerySchema = z.object({
  cacheTTL: z.coerce.number().min(0).max(86400).optional(),
});

// Base schema for browser rendering options (shared across endpoints)
// Note: We define it without refine first so we can extend it
const BrowserRenderingBaseObjectSchema = z.object({
  actionTimeout: z.number().max(120000).optional(),
  addScriptTag: z.array(z.object({
    id: z.string().optional(),
    content: z.string().optional(),
    type: z.string().optional(),
    url: z.string().optional(),
  })).optional(),
  addStyleTag: z.array(z.object({
    content: z.string().optional(),
    url: z.string().optional(),
  })).optional(),
  allowRequestPattern: z.array(z.string()).optional(),
  allowResourceTypes: z.array(z.enum([
    "document", "stylesheet", "image", "media", "font", "script",
    "texttrack", "xhr", "fetch", "eventsource", "websocket", "manifest",
    "other"
  ])).optional(),
  authenticate: z.object({
    username: z.string(),
    password: z.string(),
  }).optional(),
  bestAttempt: z.boolean().optional(),
  cookies: z.array(z.object({
    name: z.string(),
    value: z.string(),
    domain: z.string().optional(),
    path: z.string().optional(),
    expires: z.number().optional(),
    httpOnly: z.boolean().optional(),
    secure: z.boolean().optional(),
    sameSite: z.enum(["Strict", "Lax", "None"]).optional(),
  })).optional(),
  emulateMediaType: z.string().optional(),
  gotoOptions: z.object({
    referer: z.string().optional(),
    referrerPolicy: z.string().optional(),
    timeout: z.number().optional(),
    waitUntil: z.union([
      z.enum(["load", "domcontentloaded", "networkidle0", "networkidle2", "commit"]),
      z.array(z.enum(["load", "domcontentloaded", "networkidle0", "networkidle2", "commit"]))
    ]).optional(),
  }).optional(),
  html: z.string().min(1).optional(),
  rejectRequestPattern: z.array(z.string()).optional(),
  rejectResourceTypes: z.array(z.enum([
    "document", "stylesheet", "image", "media", "font", "script",
    "texttrack", "xhr", "fetch", "eventsource", "websocket", "manifest",
    "other"
  ])).optional(),
  setExtraHTTPHeaders: z.record(z.string(), z.string()).optional(),
  setJavaScriptEnabled: z.boolean().optional(),
  url: z.string().url().optional(),
  userAgent: z.string().optional(),
  viewport: z.object({
    height: z.number().optional(),
    width: z.number().optional(),
    deviceScaleFactor: z.number().optional(),
    isMobile: z.boolean().optional(),
    hasTouch: z.boolean().optional(),
    isLandscape: z.boolean().optional(),
  }).optional(),
  waitForSelector: z.object({
    selector: z.string(),
    hidden: z.boolean().optional(),
    timeout: z.number().optional(),
    visible: z.boolean().optional(),
  }).optional(),
  waitForTimeout: z.number().max(120000).optional(),
});

// Add refine to base schema
const BrowserRenderingBaseSchema = BrowserRenderingBaseObjectSchema.refine(
  (data) => data.html || data.url,
  {
    message: "Either 'html' or 'url' must be provided",
    path: ["html", "url"],
  }
);

const ScreenshotOptionsSchema = z.object({
  captureBeyondViewport: z.boolean().optional(),
  clip: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
  encoding: z.enum(["base64", "binary"]).optional(),
  fullPage: z.boolean().optional(),
  omitBackground: z.boolean().optional(),
  quality: z.number().min(0).max(100).optional(),
  type: z.enum(["png", "jpeg"]).optional(),
});

const ScreenshotRequestSchema = BrowserRenderingBaseObjectSchema.extend({
  screenshotOptions: ScreenshotOptionsSchema.optional(),
  scrollPage: z.boolean().optional(),
  selector: z.string().optional(),
}).refine(
  (data) => data.html || data.url,
  {
    message: "Either 'html' or 'url' must be provided",
    path: ["html", "url"],
  }
);

const JsonRequestSchema = BrowserRenderingBaseObjectSchema.extend({
  prompt: z.string().optional(),
  schema: z.record(z.unknown()).optional(),
  response_format: z.object({
    type: z.string(),
    schema: z.record(z.unknown()).optional(),
    json_schema: z.record(z.unknown()).optional(),
  }).optional(),
  custom_ai: z.array(z.object({
    model: z.string(),
    authorization: z.string(),
  })).optional(),
}).refine(
  (data) => data.html || data.url,
  {
    message: "Either 'html' or 'url' must be provided",
    path: ["html", "url"],
  }
).refine(
  (data) => data.prompt || data.response_format || data.schema,
  {
    message: "At least one of 'prompt', 'response_format', or 'schema' must be provided",
    path: ["prompt", "response_format", "schema"],
  }
);

const ScrapeRequestSchema = BrowserRenderingBaseObjectSchema.extend({
  selectors: z.array(z.string()).min(1),
}).refine(
  (data) => data.html || data.url,
  {
    message: "Either 'html' or 'url' must be provided",
    path: ["html", "url"],
  }
);

const app = new Hono<ContextWithCredentials>();

/**
 * Helper function to make Cloudflare Browser Rendering API requests
 */
async function makeBrowserRenderingRequest(
  credentials: CredentialsContext,
  accountId: string,
  endpoint: string,
  body: unknown,
  cacheTTL?: number
): Promise<Response> {
  const url = new URL(
    `${CLOUDFLARE.API_BASE}/accounts/${accountId}/browser-rendering/${endpoint}`
  );
  
  if (cacheTTL !== undefined) {
    url.searchParams.set("cacheTTL", String(cacheTTL));
  }

  return fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * Get HTML Content
 * POST /accounts/:account_id/browser-rendering/content
 */
app.post("/:account_id/content", async (c) => {
  try {
    const paramsValidation = validateParams(c, AccountIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }

    const queryValidation = validateQuery(c, CacheTTLQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }

    const credentials = c.var.credentials;
    const { account_id } = paramsValidation.data;
    const { cacheTTL } = queryValidation.data;

    const bodyValidation = BrowserRenderingBaseSchema.safeParse(await c.req.json());
    if (!bodyValidation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: bodyValidation.error.errors[0]?.message || "Invalid request body",
          code: ErrorCode.VALIDATION_ERROR,
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const response = await makeBrowserRenderingRequest(
      credentials,
      account_id,
      "content",
      bodyValidation.data,
      cacheTTL
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ code?: number; message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }

      logger.error("Cloudflare Browser Rendering API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        endpoint: "content",
      });

      return c.json(
        {
          success: false,
          error: "Browser rendering failed",
          message: errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`,
          code: ErrorCode.INTERNAL_ERROR,
        },
        response.status as typeof HTTP_STATUS_CODES[keyof typeof HTTP_STATUS_CODES]
      );
    }

    const data = await response.json();
    return c.json(data, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Failed to get HTML content", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to get HTML content",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * Get JSON
 * POST /accounts/:account_id/browser-rendering/json
 */
app.post("/:account_id/json", async (c) => {
  try {
    const paramsValidation = validateParams(c, AccountIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }

    const queryValidation = validateQuery(c, CacheTTLQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }

    const credentials = c.var.credentials;
    const { account_id } = paramsValidation.data;
    const { cacheTTL } = queryValidation.data;

    const bodyValidation = 
    JsonRequestSchema.safeParse(await c.req.json());
    if (!bodyValidation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: bodyValidation.error.errors[0]?.message || "Invalid request body",
          code: ErrorCode.VALIDATION_ERROR,
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const response = await makeBrowserRenderingRequest(
      credentials,
      account_id,
      "json",
      bodyValidation.data,
      cacheTTL
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ code?: number; message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }

      logger.error("Cloudflare Browser Rendering API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        endpoint: "json",
      });

      return c.json(
        {
          success: false,
          error: "Browser rendering failed",
          message: errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`,
          code: ErrorCode.INTERNAL_ERROR,
        },
        response.status as typeof HTTP_STATUS_CODES[keyof typeof HTTP_STATUS_CODES]
      );
    }

    const data = await response.json();
    return c.json(data, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Failed to get JSON", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to get JSON",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * Get Links
 * POST /accounts/:account_id/browser-rendering/links
 */
app.post("/:account_id/links", async (c) => {
  try {
    const paramsValidation = validateParams(c, AccountIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }

    const queryValidation = validateQuery(c, CacheTTLQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }

    const credentials = c.var.credentials;
    const { account_id } = paramsValidation.data;
    const { cacheTTL } = queryValidation.data;

    const bodyValidation = BrowserRenderingBaseSchema.safeParse(await c.req.json());
    if (!bodyValidation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: bodyValidation.error.errors[0]?.message || "Invalid request body",
          code: ErrorCode.VALIDATION_ERROR,
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const response = await makeBrowserRenderingRequest(
      credentials,
      account_id,
      "links",
      bodyValidation.data,
      cacheTTL
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ code?: number; message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }

      logger.error("Cloudflare Browser Rendering API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        endpoint: "links",
      });

      return c.json(
        {
          success: false,
          error: "Browser rendering failed",
          message: errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`,
          code: ErrorCode.INTERNAL_ERROR,
        },
        response.status as typeof HTTP_STATUS_CODES[keyof typeof HTTP_STATUS_CODES]
      );
    }

    const data = await response.json();
    return c.json(data, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Failed to get links", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to get links",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * Get Markdown
 * POST /accounts/:account_id/browser-rendering/markdown
 */
app.post("/:account_id/markdown", async (c) => {
  try {
    const paramsValidation = validateParams(c, AccountIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }

    const queryValidation = validateQuery(c, CacheTTLQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }

    const credentials = c.var.credentials;
    const { account_id } = paramsValidation.data;
    const { cacheTTL } = queryValidation.data;

    const bodyValidation = BrowserRenderingBaseSchema.safeParse(await c.req.json());
    if (!bodyValidation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: bodyValidation.error.errors[0]?.message || "Invalid request body",
          code: ErrorCode.VALIDATION_ERROR,
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const response = await makeBrowserRenderingRequest(
      credentials,
      account_id,
      "markdown",
      bodyValidation.data,
      cacheTTL
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ code?: number; message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }

      logger.error("Cloudflare Browser Rendering API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        endpoint: "markdown",
      });

      return c.json(
        {
          success: false,
          error: "Browser rendering failed",
          message: errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`,
          code: ErrorCode.INTERNAL_ERROR,
        },
        response.status as typeof HTTP_STATUS_CODES[keyof typeof HTTP_STATUS_CODES]
      );
    }

    const data = await response.json();
    return c.json(data, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Failed to get markdown", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to get markdown",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * Get PDF
 * POST /accounts/:account_id/browser-rendering/pdf
 */
app.post("/:account_id/pdf", async (c) => {
  try {
    const paramsValidation = validateParams(c, AccountIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }

    const queryValidation = validateQuery(c, CacheTTLQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }

    const credentials = c.var.credentials;
    const { account_id } = paramsValidation.data;
    const { cacheTTL } = queryValidation.data;

    const bodyValidation = BrowserRenderingBaseSchema.safeParse(await c.req.json());
    if (!bodyValidation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: bodyValidation.error.errors[0]?.message || "Invalid request body",
          code: ErrorCode.VALIDATION_ERROR,
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const response = await makeBrowserRenderingRequest(
      credentials,
      account_id,
      "pdf",
      bodyValidation.data,
      cacheTTL
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ code?: number; message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }

      logger.error("Cloudflare Browser Rendering API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        endpoint: "pdf",
      });

      return c.json(
        {
          success: false,
          error: "Browser rendering failed",
          message: errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`,
          code: ErrorCode.INTERNAL_ERROR,
        },
        response.status as typeof HTTP_STATUS_CODES[keyof typeof HTTP_STATUS_CODES]
      );
    }

    // PDF returns binary data, so we need to handle it differently
    const pdfBuffer = await response.arrayBuffer();
    return new Response(pdfBuffer, {
      status: HTTP_STATUS_CODES.OK,
      headers: {
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    logger.error("Failed to get PDF", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to get PDF",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * Scrape Elements
 * POST /accounts/:account_id/browser-rendering/scrape
 */
app.post("/:account_id/scrape", async (c) => {
  try {
    const paramsValidation = validateParams(c, AccountIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }

    const queryValidation = validateQuery(c, CacheTTLQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }

    const credentials = c.var.credentials;
    const { account_id } = paramsValidation.data;
    const { cacheTTL } = queryValidation.data;

    const bodyValidation = ScrapeRequestSchema.safeParse(await c.req.json());
    if (!bodyValidation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: bodyValidation.error.errors[0]?.message || "Invalid request body",
          code: ErrorCode.VALIDATION_ERROR,
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const response = await makeBrowserRenderingRequest(
      credentials,
      account_id,
      "scrape",
      bodyValidation.data,
      cacheTTL
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ code?: number; message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }

      logger.error("Cloudflare Browser Rendering API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        endpoint: "scrape",
      });

      return c.json(
        {
          success: false,
          error: "Browser rendering failed",
          message: errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`,
          code: ErrorCode.INTERNAL_ERROR,
        },
        response.status as typeof HTTP_STATUS_CODES[keyof typeof HTTP_STATUS_CODES]
      );
    }

    const data = await response.json();
    return c.json(data, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Failed to scrape elements", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to scrape elements",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * Get Screenshot
 * POST /accounts/:account_id/browser-rendering/screenshot
 */
app.post("/:account_id/screenshot", async (c) => {
  try {
    const paramsValidation = validateParams(c, AccountIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }

    const queryValidation = validateQuery(c, CacheTTLQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }

    const credentials = c.var.credentials;
    const { account_id } = paramsValidation.data;
    const { cacheTTL } = queryValidation.data;

    const bodyValidation = ScreenshotRequestSchema.safeParse(await c.req.json());
    if (!bodyValidation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: bodyValidation.error.errors[0]?.message || "Invalid request body",
          code: ErrorCode.VALIDATION_ERROR,
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const response = await makeBrowserRenderingRequest(
      credentials,
      account_id,
      "screenshot",
      bodyValidation.data,
      cacheTTL
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ code?: number; message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }

      logger.error("Cloudflare Browser Rendering API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        endpoint: "screenshot",
      });

      return c.json(
        {
          success: false,
          error: "Browser rendering failed",
          message: errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`,
          code: ErrorCode.INTERNAL_ERROR,
        },
        response.status as typeof HTTP_STATUS_CODES[keyof typeof HTTP_STATUS_CODES]
      );
    }

    // Screenshot endpoint can return either JSON (with status/errors) or a data URL string
    // Try to parse as JSON first, if that fails, treat as screenshot data
    const responseText = await response.text();
    
    try {
      // Try to parse as JSON
      const data = JSON.parse(responseText);
      return c.json(data, HTTP_STATUS_CODES.OK);
    } catch {
      // Not JSON - it's likely a data URL or base64 string (screenshot data)
      // Return in the expected format
      return c.json({
        status: true,
        result: responseText,
      }, HTTP_STATUS_CODES.OK);
    }
  } catch (error) {
    logger.error("Failed to get screenshot", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to get screenshot",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * Get Snapshot (HTML Content and Screenshot)
 * POST /accounts/:account_id/browser-rendering/snapshot
 */
app.post("/:account_id/snapshot", async (c) => {
  try {
    const paramsValidation = validateParams(c, AccountIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }

    const queryValidation = validateQuery(c, CacheTTLQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }

    const credentials = c.var.credentials;
    const { account_id } = paramsValidation.data;
    const { cacheTTL } = queryValidation.data;

    const bodyValidation = ScreenshotRequestSchema.safeParse(await c.req.json());
    if (!bodyValidation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: bodyValidation.error.errors[0]?.message || "Invalid request body",
          code: ErrorCode.VALIDATION_ERROR,
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const response = await makeBrowserRenderingRequest(
      credentials,
      account_id,
      "snapshot",
      bodyValidation.data,
      cacheTTL
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ code?: number; message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }

      logger.error("Cloudflare Browser Rendering API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        endpoint: "snapshot",
      });

      return c.json(
        {
          success: false,
          error: "Browser rendering failed",
          message: errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`,
          code: ErrorCode.INTERNAL_ERROR,
        },
        response.status as typeof HTTP_STATUS_CODES[keyof typeof HTTP_STATUS_CODES]
      );
    }

    const data = await response.json();
    return c.json(data, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Failed to get snapshot", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to get snapshot",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;

