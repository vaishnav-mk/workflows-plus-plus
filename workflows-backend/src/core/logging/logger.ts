/**
 * Simple Logging System
 * Basic logging with stack traces for errors
 */

import { LogLevel } from "../enums";
import { LOGGING } from "../constants";

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

class Logger {
  private logLevel: LogLevel;
  private enableRequestLogging: boolean;
  private enableResponseLogging: boolean;
  private enablePerformanceLogging: boolean;

  constructor() {
    this.logLevel = (LOGGING.DEFAULT_LEVEL as LogLevel) || LogLevel.INFO;
    this.enableRequestLogging = LOGGING.ENABLE_REQUEST_LOGGING;
    this.enableResponseLogging = LOGGING.ENABLE_RESPONSE_LOGGING;
    this.enablePerformanceLogging = LOGGING.ENABLE_PERFORMANCE_LOGGING;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR
    ];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLog(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toISOString();
    const parts = [`[${time}]`, `[${entry.level}]`, entry.message];

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    if (entry.error) {
      parts.push(`\nError: ${entry.error.name} - ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(`\nStack trace:\n${entry.error.stack}`);
      }
    }

    return parts.join(" ");
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    const formatted = this.formatLog(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  logRequest(method: string, url: string, context?: LogContext): void {
    // Only log compiler routes
    if (url.includes("/api/compiler")) {
      this.info(`Request: ${method} ${url}`, context);
    }
  }

  logResponse(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    // Only log compiler routes
    if (url.includes("/api/compiler")) {
      const level =
        statusCode >= 500
          ? LogLevel.ERROR
          : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
      this.log(
        level,
        `Response: ${method} ${url} - ${statusCode} (${duration}ms)`,
        context
      );
    }
  }

  logPerformance(
    operation: string,
    duration: number,
    context?: LogContext
  ): void {
    // Only log performance for compiler operations
    if (
      operation.includes("compiler") ||
      operation.includes("codegen") ||
      operation.includes("workflow")
    ) {
      this.info(`[${operation}] ${duration}ms`, context);
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  createChild(context?: LogContext): Logger {
    // Context is stored for potential future use in child logger
    void context;
    const child = new Logger();
    child.logLevel = this.logLevel;
    child.enableRequestLogging = this.enableRequestLogging;
    child.enableResponseLogging = this.enableResponseLogging;
    child.enablePerformanceLogging = this.enablePerformanceLogging;
    return child;
  }
}

export const logger = new Logger();
