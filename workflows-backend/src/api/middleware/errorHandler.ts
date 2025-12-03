import { Context } from "hono";
import { ErrorResponse } from "../../core/api-contracts";
import { ErrorCode } from "../../core/enums";
import { HTTP_STATUS_CODES } from "../../core/constants";
import { logger } from "../../core/logging/logger";

export const errorHandler = (error: Error, c: Context): Response => {
  // Only log errors with stack traces (important for debugging)
  logger.error(`Error: ${c.req.method} ${c.req.url}`, error);

  // Check if error has a code property (custom error)
  const errorCode =
    (error as { code?: ErrorCode }).code || ErrorCode.INTERNAL_ERROR;
  const statusCode =
    errorCode === ErrorCode.NOT_FOUND
      ? HTTP_STATUS_CODES.NOT_FOUND
      : errorCode === ErrorCode.VALIDATION_ERROR
        ? HTTP_STATUS_CODES.BAD_REQUEST
        : HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;

  const errorResponse: ErrorResponse = {
    success: false,
    error: error.name || "Internal Server Error",
    message: error.message || "An unexpected error occurred",
    code: errorCode
  };

  return c.json(errorResponse, statusCode);
};

export const notFoundHandler = (c: Context): Response => {
  // Only log errors for compiler routes
  if (c.req.path.startsWith("/api/compiler")) {
    logger.warn("Route not found", {
      method: c.req.method,
      path: c.req.path,
      url: c.req.url
    });
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: "Not Found",
    message: `Route ${c.req.method} ${c.req.url} not found`,
    code: ErrorCode.NOT_FOUND
  };

  return c.json(errorResponse, HTTP_STATUS_CODES.NOT_FOUND);
};
