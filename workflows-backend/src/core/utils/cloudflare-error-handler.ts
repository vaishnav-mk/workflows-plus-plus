/**
 * Cloudflare API Error Handler
 * Parses Cloudflare API errors and maps them to appropriate HTTP status codes
 */

import { HTTP_STATUS_CODES } from "../constants";
import { ErrorCode } from "../enums";

interface CloudflareErrorResponse {
  success: false;
  errors?: Array<{
    code?: number;
    message?: string;
  }>;
  messages?: unknown[];
  result?: unknown;
}

interface EffectError {
  _tag: string;
  message: string;
}

/**
 * Parse Cloudflare API error from error message
 * Cloudflare SDK wraps errors as JSON strings like: "404 {\"success\":false,\"errors\":[...]}"
 */
export function parseCloudflareError(error: unknown): {
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
} {
  const defaultResponse = {
    statusCode: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode.INTERNAL_ERROR,
    message: error instanceof Error ? error.message : String(error)
  };

  if (!error) {
    return defaultResponse;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Try to parse Effect error format (JSON string with _tag)
  try {
    // Check if it looks like JSON
    if (errorMessage.trim().startsWith("{") && errorMessage.includes("_tag")) {
      const parsed = JSON.parse(errorMessage) as EffectError;
      if (parsed && typeof parsed === "object" && "_tag" in parsed) {
        const tag = parsed._tag;
        const msg = parsed.message || errorMessage;
        
        // Map Effect error tags to status codes
        if (
          tag === "VALIDATION_ERROR" ||
          tag === "GRAPH_VALIDATION_ERROR" ||
          tag === "MISSING_ENTRY_NODE" ||
          tag === "CYCLE_DETECTED" ||
          tag === "INVALID_CONFIG" ||
          tag === "MISSING_BINDING"
        ) {
          return {
            statusCode: HTTP_STATUS_CODES.BAD_REQUEST,
            errorCode: ErrorCode.VALIDATION_ERROR,
            message: msg
          };
        }
        
        if (tag === "NOT_FOUND" || tag === "NODE_NOT_FOUND") {
          return {
            statusCode: HTTP_STATUS_CODES.NOT_FOUND,
            errorCode: ErrorCode.NOT_FOUND,
            message: msg
          };
        }
        
        return {
          statusCode: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
          errorCode: ErrorCode.INTERNAL_ERROR,
          message: msg
        };
      }
    }
  } catch {
    // Ignore JSON parse errors here, continue to other checks
  }

  // Try to parse Cloudflare API error format: "404 {...json...}"
  const match = errorMessage.match(/^(\d+)\s*({.*})$/);
  if (match) {
    const statusCode = parseInt(match[1], 10);
    try {
      const errorData = JSON.parse(match[2]) as CloudflareErrorResponse;
      const cloudflareMessage = errorData.errors?.[0]?.message || errorMessage;
      
      // Map Cloudflare error codes to HTTP status codes
      if (statusCode === 404 || errorData.errors?.[0]?.code === 10007 || errorData.errors?.[0]?.code === 10200) {
        return {
          statusCode: HTTP_STATUS_CODES.NOT_FOUND,
          errorCode: ErrorCode.NOT_FOUND,
          message: cloudflareMessage
        };
      }
      
      return {
        statusCode: statusCode >= 400 && statusCode < 600 ? statusCode : HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        errorCode: ErrorCode.INTERNAL_ERROR,
        message: cloudflareMessage
      };
    } catch {
      // If JSON parsing fails, use the status code from the match
      return {
        statusCode: statusCode >= 400 && statusCode < 600 ? statusCode : HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        errorCode: ErrorCode.INTERNAL_ERROR,
        message: errorMessage
      };
    }
  }

  // Check for specific error patterns
  if (errorMessage.includes("does not exist") || 
      errorMessage.includes("not found") ||
      errorMessage.includes("workflow.not_found") ||
      errorMessage.includes("Worker does not exist")) {
    return {
      statusCode: HTTP_STATUS_CODES.NOT_FOUND,
      errorCode: ErrorCode.NOT_FOUND,
      message: errorMessage
    };
  }

  // Check for SQL syntax errors
  if (errorMessage.includes("SQLITE_ERROR") || 
      errorMessage.includes("syntax error") ||
      errorMessage.includes("near")) {
    return {
      statusCode: HTTP_STATUS_CODES.BAD_REQUEST,
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: errorMessage
    };
  }

  // Check for bucket not found
  if (errorMessage.includes("bucket does not exist") ||
      errorMessage.includes("The specified bucket does not exist")) {
    return {
      statusCode: HTTP_STATUS_CODES.NOT_FOUND,
      errorCode: ErrorCode.NOT_FOUND,
      message: errorMessage
    };
  }

  // Check for system limits
  if (errorMessage.includes("System limit reached") ||
      errorMessage.includes("limit reached")) {
    return {
      statusCode: HTTP_STATUS_CODES.BAD_REQUEST,
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: errorMessage
    };
  }
  
  // Check for AI Gateway configuration error
  if (errorMessage.includes("AI Gateway not configured")) {
    return {
      statusCode: HTTP_STATUS_CODES.SERVICE_UNAVAILABLE,
      errorCode: ErrorCode.INTERNAL_ERROR, // Or maybe CONFIGURATION_ERROR if we had it
      message: errorMessage
    };
  }

  return defaultResponse;
}
