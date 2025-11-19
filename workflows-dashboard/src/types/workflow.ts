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
// NodeType is now dynamically defined from backend registry
// This type is kept for backward compatibility and type safety
export type NodeType = string;

export type ComparisonOperator =
  | "==="
  | "!=="
  | ">"
  | ">="
  | "<"
  | "<="
  | "includes"
  | "startsWith"
  | "endsWith"
  | "exists"
  | "isEmpty";

export interface BaseNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
  metadata: {
    label: string;
    description?: string;
    icon: string;
    category: NodeCategory;
    version: string;
  };
}

export interface NodeData {
  config: Record<string, unknown>;
  inputs: Array<InputPort>;
  outputs: Array<OutputPort>;
  validation: ValidationState;
  stepName?: string;
  retry?: RetryConfig;
}

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  delay: number;
  delayUnit: "ms" | "seconds" | "minutes";
  backoff: "linear" | "exponential";
  maxDelay?: number;
}

export interface InputPort {
  id: string;
  label: string;
  type: DataType;
  required: boolean;
  defaultValue?: unknown;
  accepts: Array<string>;
}

export interface OutputPort {
  id: string;
  label: string;
  type: DataType;
  description: string;
}

export interface ValidationState {
  isValid: boolean;
  errors: Array<ValidationError>;
  warnings: Array<ValidationWarning>;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface Edge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  type: EdgeType;
  data: {
    dataBinding?: {
      sourceVar: string;
      targetParam: string;
    };
  };
  style: {
    stroke: string;
    strokeWidth: number;
    animated: boolean;
  };
}

export type EdgeType =
  | "control"
  | "data"
  | "conditional-true"
  | "conditional-false"
  | "loop"
  | "error"
  | "parallel";

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  metadata: {
    createdAt: number;
    updatedAt: number;
    author: string;
    tags: Array<string>;
  };
  bindings: {
    kv: Array<{ name: string; binding: string }>;
    d1: Array<{ name: string; binding: string; databaseId: string }>;
    r2: Array<{ name: string; binding: string; bucketName: string }>;
    ai: { binding: string };
    secrets: Array<{ name: string }>;
  };
  nodes: Array<BaseNode>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    type?: string;
    animated?: boolean;
  }>;
  entryNodeId: string;
  variables: Record<string, VariableDefinition>;
}

export interface VariableDefinition {
  nodeId: string;
  stepName: string;
  type: DataType;
  schema: Record<string, unknown>;
}

export interface ParamDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  defaultValue?: unknown;
  description?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: Array<unknown>;
  };
}

export interface ValidationRule {
  field: string;
  type: "required" | "email" | "url" | "regex" | "range" | "length" | "custom";
  config: {
    pattern?: string;
    min?: number;
    max?: number;
    customCode?: string;
  };
  message: string;
}
