export interface ExecutionContext {
  config: any;
  inputData: any;
  env?: any; // Cloudflare env for bindings
  logs: string[];
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  logs: string[];
}

export type NodeCategory =
  | "control"
  | "http"
  | "storage"
  | "database"
  | "transform"
  | "timing"
  | "ai"
  | "messaging";

export type DataType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "any";
