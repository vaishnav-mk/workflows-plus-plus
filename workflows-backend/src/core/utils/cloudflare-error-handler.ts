import { HTTP_STATUS_CODES } from "../constants";
import { ErrorCode } from "../enums";
import { CloudflareErrorResponse, EffectError } from "../../types/errors";
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

  if (error instanceof RangeError && error.message.includes("status codes")) {
    return {
      statusCode: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.INTERNAL_ERROR,
      message: "Invalid HTTP status code"
    };
  }

  if (!error) {
    return defaultResponse;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  try {
    if (errorMessage.trim().startsWith("{") && errorMessage.includes("_tag")) {
      const parsed = JSON.parse(errorMessage) as EffectError;
      if (parsed && typeof parsed === "object" && "_tag" in parsed) {
        const tag = parsed._tag;
        const msg = parsed.message || errorMessage;

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
  }

  const match = errorMessage.match(/^(\d+)\s*({.*})$/);
  if (match) {
    const statusCode = parseInt(match[1], 10);
    if (isNaN(statusCode) || statusCode < 200 || statusCode > 599) {
      return defaultResponse;
    }
    try {
      const errorData = JSON.parse(match[2]) as CloudflareErrorResponse;
      const cloudflareMessage = errorData.errors?.[0]?.message || errorMessage;

      if (statusCode === 404 || errorData.errors?.[0]?.code === 10007 || errorData.errors?.[0]?.code === 10200) {
        return {
          statusCode: HTTP_STATUS_CODES.NOT_FOUND,
          errorCode: ErrorCode.NOT_FOUND,
          message: cloudflareMessage
        };
      }
      
      const validStatusCode = Math.max(200, Math.min(599, statusCode));
      return {
        statusCode: validStatusCode >= 400 && validStatusCode < 600 ? validStatusCode : HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        errorCode: ErrorCode.INTERNAL_ERROR,
        message: cloudflareMessage
      };
    } catch {
      const validStatusCode = Math.max(200, Math.min(599, statusCode));
      return {
        statusCode: validStatusCode >= 400 && validStatusCode < 600 ? validStatusCode : HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        errorCode: ErrorCode.INTERNAL_ERROR,
        message: errorMessage
      };
    }
  }

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

  if (errorMessage.includes("SQLITE_ERROR") || 
      errorMessage.includes("syntax error") ||
      errorMessage.includes("near")) {
    return {
      statusCode: HTTP_STATUS_CODES.BAD_REQUEST,
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: errorMessage
    };
  }

  if (errorMessage.includes("bucket does not exist") ||
      errorMessage.includes("The specified bucket does not exist")) {
    return {
      statusCode: HTTP_STATUS_CODES.NOT_FOUND,
      errorCode: ErrorCode.NOT_FOUND,
      message: errorMessage
    };
  }

  if (errorMessage.includes("System limit reached") ||
      errorMessage.includes("limit reached")) {
    return {
      statusCode: HTTP_STATUS_CODES.BAD_REQUEST,
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: errorMessage
    };
  }

  if (errorMessage.includes("AI Gateway not configured")) {
    return {
      statusCode: HTTP_STATUS_CODES.SERVICE_UNAVAILABLE,
      errorCode: ErrorCode.INTERNAL_ERROR,
      message: errorMessage
    };
  }

  return defaultResponse;
}
