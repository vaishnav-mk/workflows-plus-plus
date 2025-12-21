import { DeploymentStatus, DeploymentStep } from "@/config/enums";

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string;
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface WorkflowNode {
  id: string;
  type: string;
  data: {
    label: string;
    type: string;
    config: Record<string, unknown>;
    [key: string]: unknown;
  };
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  options: Record<string, unknown>;
}

export interface CompileWorkflowRequest {
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  options: Record<string, unknown>;
}

export interface CompileWorkflowResponse {
  tsCode: string;
  bindings: Binding[];
}

export interface Binding {
  name: string;
  type: string;
}

export interface ResolveWorkflowRequest {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ReverseCodegenRequest {
  code: string;
}

export interface ReverseCodegenResponse {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ValidateWorkflowRequest {
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface DeployWorkflowRequest {
  workflowName: string;
  subdomain: string;
  bindings: Binding[];
  assets: Record<string, unknown>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  options: Record<string, unknown>;
  workflowId: string;
}

export interface DeployWorkflowResponse {
  deploymentId: string;
  workflowId: string;
  result: {
    instanceId: string;
    workerUrl: string;
    mcpUrl: string;
    versionId: string;
    deploymentId: string;
    status: string;
    bindings: Binding[];
  };
}

export interface GenerateWorkflowFromAIRequest {
  image: string;
  imageMimeType: string;
  text: string;
}

export interface GenerateWorkflowFromAIResponse {
  workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  missingRequiredFields: string[];
}

export interface WorkflowStarterFilter {
  category: string;
  difficulty: string;
  tags: string[];
}

export interface WorkflowStarter {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
}

export interface D1Database {
  uuid: string;
  name: string;
  created_at: string;
  version: string;
}

export interface D1DatabaseSchema {
  tables: D1Table[];
}

export interface D1Table {
  name: string;
  sql: string;
}

export interface D1DatabaseQueryRequest {
  query: string;
  sql: string;
}

export interface D1DatabaseQueryResponse {
  results: unknown[];
  meta: {
    changed_db: boolean;
    changes: number;
    duration: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
    size_after: number;
  };
  success: boolean;
  error: string;
}

export interface CreateD1DatabaseRequest {
  name: string;
}

export interface KVNamespace {
  id: string;
  title: string;
}

export interface CreateKVNamespaceRequest {
  title: string;
}

export interface KVKey {
  key: string;
  expiration?: number;
  metadata?: unknown;
}

export interface KVKeysResponse {
  keys: KVKey[];
  truncated: boolean;
  cursor: string | null;
}

export interface R2Bucket {
  name: string;
  location: string;
  creation_date: string;
}

export interface R2Object {
  key: string;
  size: number;
  etag: string;
  uploaded: string;
}

export interface R2ObjectsResponse {
  objects: R2Object[];
  truncated: boolean;
  cursor: string;
}

export interface CreateR2BucketRequest {
  name: string;
  location: string;
}

export interface ListR2ObjectsRequest {
  prefix: string;
  perPage: number;
  cursor: string;
}

export interface NodeDefinition {
  metadata: {
    type: string;
    name: string;
    description: string;
    category: string;
    version: string;
    icon: string;
    color: string;
    tags: string[];
  };
  configSchema: Record<string, unknown>;
  inputPorts: Array<{
    id: string;
    label: string;
    type: string;
    description: string;
    required: boolean;
    defaultValue: unknown;
  }>;
  outputPorts: Array<{
    id: string;
    label: string;
    type: string;
    description: string;
  }>;
  bindings: Array<{
    type: string;
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
  examples: Array<{
    name: string;
    description: string;
    config: Record<string, unknown>;
    expectedOutput: unknown;
  }>;
  presetOutput: unknown;
}

export interface CatalogItem {
  type: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  tags: string[];
}

export interface Worker {
  id: string;
  name: string;
  created_on: string;
  updated_on: string;
  subdomain: {
    enabled: boolean;
  };
  observability: {
    enabled: boolean;
  };
}

export interface WorkerVersion {
  id: string;
  number: number;
  created_on: string;
  compatibility_date: string;
  main_module: string;
  annotations: {
    "workers/triggered_by": string;
    "workers/message": string;
    "workers/tag": string;
  };
  usage_model: string;
  source: string;
  modules: Array<{
    name: string;
    content_type: string;
    content_base64: string;
  }>;
  bindings: Array<{
    name: string;
    type: string;
    text: string;
    json: boolean;
  }>;
}

export interface DeploymentStateResponse {
  deploymentId: string;
  workflowId: string;
  status: DeploymentStatus;
  progress: DeploymentProgress[];
  result: {
    instanceId: string;
    workerUrl: string;
    mcpUrl: string;
    versionId: string;
    deploymentId: string;
    status: string;
    bindings: Binding[];
  };
  error: string;
  startedAt: string;
  completedAt: string;
}

export interface DeploymentProgress {
  step: DeploymentStep;
  message: string;
  progress: number;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface ExecuteNodeRequest {
  [key: string]: unknown;
}
