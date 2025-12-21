import { LogLevel } from "../../core/enums";

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration: number;
    operation: string;
  };
  request?: {
    method: string;
    url: string;
    statusCode?: number;
    userAgent?: string;
    ip?: string;
  };
}
