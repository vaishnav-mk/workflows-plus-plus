import { ErrorCode } from "../../core/enums";

export class DeploymentError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DeploymentError";
  }
}
