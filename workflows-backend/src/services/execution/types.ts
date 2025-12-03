/**
 * Node Execution Service Types
 */

export interface ExecutionRequest {
  type: string;
  config: Record<string, unknown>;
  inputData?: Record<string, unknown>;
}

export interface ExecutionResult {
  output: unknown;
  logs: string[];
  duration: number;
  success: boolean;
  error?: {
    message: string;
    stack?: string;
  };
}

