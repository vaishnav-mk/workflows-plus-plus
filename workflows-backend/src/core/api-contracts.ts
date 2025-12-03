/**
 * API Contract Types for Request/Response
 */

import { TemplateResolutionStatus, ErrorCode } from "./enums";
import { CompilationResult } from "./types";

/**
 * Lightweight node catalog response (<5KB)
 */
export interface CatalogResponse {
  success: boolean;
  data: Array<{
    type: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    version: string;
  }>;
  message?: string;
}

/**
 * Full node schema response for property panel
 */
export interface NodeSchemaResponse {
  success: boolean;
  data: {
    metadata: {
      type: string;
      name: string;
      description: string;
      icon: string;
      category: string;
      version: string;
    };
    configSchema: Record<string, unknown>; // JSON Schema
    inputPorts: Array<Record<string, unknown>>;
    outputPorts: Array<Record<string, unknown>>;
    bindings: Array<Record<string, unknown>>;
    capabilities: Record<string, unknown>;
    examples: Array<Record<string, unknown>>;
    presetOutput?: unknown;
  };
  message?: string;
}

/**
 * Compilation response
 */
export interface CompilationResponse {
  success: boolean;
  data: CompilationResult;
  message?: string;
  errors?: Array<{
    code: ErrorCode;
    message: string;
    context?: Record<string, any>;
  }>;
}

/**
 * Binding validation response
 */
export interface BindingValidationResponse {
  success: boolean;
  data: {
    required: Array<{
      name: string;
      type: string;
      usage: Array<{
        nodeId: string;
        nodeLabel: string;
      }>;
    }>;
    available: Array<{
      name: string;
      type: string;
      id?: string;
    }>;
    missing: Array<{
      name: string;
      type: string;
    }>;
    warnings: string[];
  };
  message?: string;
}

/**
 * Template resolution response
 */
export interface TemplateResolutionResponse {
  success: boolean;
  data: {
    nodes: Array<{
      nodeId: string;
      original: Record<string, unknown>;
      resolved: Record<string, unknown>;
      status: TemplateResolutionStatus;
      errors?: string[];
    }>;
    errors: Array<{
      nodeId: string;
      expression: string;
      message: string;
      status: TemplateResolutionStatus;
    }>;
  };
  message?: string;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code: ErrorCode;
  context?: Record<string, any>;
  details?: Array<{
    path: string;
    message: string;
  }>;
}

