import { ErrorCode } from "../../core/enums";

export class AIGatewayError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AIGatewayError";
  }
}

export class AIGatewayTimeoutError extends AIGatewayError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(ErrorCode.AI_GATEWAY_ERROR, message, {
      ...context,
      timeout: true
    });
    this.name = "AIGatewayTimeoutError";
  }
}

export class AIGatewayAPIError extends AIGatewayError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown,
    context?: Record<string, unknown>
  ) {
    super(ErrorCode.AI_GATEWAY_ERROR, message, {
      ...context,
      statusCode,
      response
    });
    this.name = "AIGatewayAPIError";
  }
}
