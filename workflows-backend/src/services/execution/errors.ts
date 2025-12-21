import { ErrorCode } from "../../core/enums";

export class ExecutionError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ExecutionError";
  }
}
