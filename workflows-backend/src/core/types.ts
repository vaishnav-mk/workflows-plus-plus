/**
 * Core Type Definitions for Workflow System
 */

import { z } from "zod";
import { Effect } from "effect";
import { ErrorCode } from "./enums";
import { NodeType, BindingType } from "./enums";

/**
 * Context passed to node codegen functions
 */
export interface CodeGenContext<T = unknown> {
  nodeId: string;
  config: T;
  prevStepId: string;
  stepName: string;
  graphContext: GraphContext;
}

/**
 * Result of code generation for a single node
 */
export interface CodeGenResult {
  code: string;
  requiredBindings?: Array<{
    name: string;
    type: BindingType;
    description?: string;
  }>;
}

/**
 * Graph context containing full workflow structure
 */
export interface GraphContext {
  nodes: Array<{
    id: string;
    type: NodeType | string;
    data?: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
  stepNameMap: Map<string, string>; // nodeId -> stepName
  nodeIdMap: Map<string, string>; // stepName -> nodeId
  topoOrder: string[]; // Ordered node IDs
  entryNodeId?: string;
}

/**
 * Options for workflow compilation
 */
export interface CompilationOptions {
  enableLogging?: boolean;
  enableMCP?: boolean;
  className?: string;
  desiredWorkflowName?: string;
  workflowId?: string;
}

/**
 * Full compilation result
 */
export interface CompilationResult {
  tsCode: string;
  wranglerConfig: string;
  bindings: Array<{
    name: string;
    type: BindingType;
    usage: Array<{
      nodeId: string;
      nodeLabel: string;
      nodeType: string;
    }>;
  }>;
  mcpManifest?: Record<string, unknown>;
  className: string;
  status: "success" | "error" | "warning";
  errors?: string[];
  warnings?: string[];
}

/**
 * Node definition interface
 */
export interface WorkflowNodeDefinition<T = unknown> {
  metadata: {
    type: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    version: string;
    color?: string;
    tags?: string[];
  };
  configSchema: z.ZodTypeAny;
  inputPorts: Array<{
    id: string;
    label: string;
    type: string;
    description: string;
    required: boolean;
    defaultValue?: unknown;
  }>;
  outputPorts: Array<{
    id: string;
    label: string;
    type: string;
    description: string;
    required: boolean;
  }>;
  bindings: Array<{
    type: BindingType;
    name: string;
    required: boolean;
    description: string;
  }>;
  capabilities: {
    playgroundCompatible: boolean;
    supportsRetry: boolean;
    isAsync: boolean;
    canFail: boolean;
  };
  validation: {
    rules: Array<Record<string, unknown>>;
    errorMessages: Record<string, string>;
  };
  examples: Array<{
    name: string;
    description: string;
    config: Record<string, unknown>;
    expectedOutput?: unknown;
  }>;
  presetOutput?: unknown;
  codegen: (ctx: CodeGenContext<T>) => Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }>;
}

