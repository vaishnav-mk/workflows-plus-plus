import { z } from "zod";
import Cloudflare from "cloudflare";
import { Effect } from "effect";
import {
  ErrorCode,
  NodeType,
  BindingType,
  TemplateResolutionStatus,
  DeploymentStatus,
  DeploymentStep
} from "./enums";

export interface CredentialsContext {
  apiToken: string;
  accountId: string;
}

export interface CloudflareContext {
  cloudflare: Cloudflare;
}

export interface AppContext {
  Bindings: {
    DB?: D1Database;
    ENVIRONMENT?: string;
    AI_GATEWAY_URL?: string;
    AI_GATEWAY_TOKEN?: string;
    DEPLOYMENT_DO?: DurableObjectNamespace;
    RATE_LIMIT_DO?: DurableObjectNamespace;
    CREDENTIALS_MASTER_KEY?: string;
    [key: string]: unknown;
  };
  Variables: {
    credentials?: CredentialsContext;
    cloudflare?: Cloudflare;
  };
}

export interface CodeGenContext<T = unknown> {
  nodeId: string;
  config: T;
  prevStepId: string;
  stepName: string;
  graphContext: GraphContext;
}

export interface CodeGenResult {
  code: string;
  requiredBindings?: Array<{
    name: string;
    type: BindingType;
    description?: string;
  }>;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id?: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface GraphContext {
  nodes: Array<{
    id: string;
    type: NodeType | string;
    data?: Record<string, unknown>;
  }>;
  edges: WorkflowEdge[];
  stepNameMap: Map<string, string>;
  nodeIdMap: Map<string, string>;
  topoOrder: string[];
  entryNodeId?: string;
}

export interface CompilationOptions {
  enableLogging?: boolean;
  enableMCP?: boolean;
  className?: string;
  desiredWorkflowName?: string;
  workflowId?: string;
}

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
  codegen: (
    ctx: CodeGenContext<T>
  ) => Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }>;
}

export interface TemplateResolutionResult {
  resolved: string;
  status: TemplateResolutionStatus;
  errors?: string[];
}

export interface ReverseCodegenResult {
  nodes: Array<{
    id: string;
    type: string;
    data?: {
      label?: string;
      config?: Record<string, unknown>;
    };
    config?: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}

export interface CloudflareCredentials {
  apiToken: string;
  accountId: string;
}

export interface BindingUsage {
  name: string;
  type: BindingType;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
}

export interface BindingConfiguration {
  name: string;
  type: BindingType;
  id?: string;
  databaseName?: string;
  bucketName?: string;
  serviceName?: string;
  previewId?: string;
}

export interface DeploymentOptions {
  workflowName: string;
  className: string;
  scriptName: string;
  scriptContent: string;
  subdomain?: string;
  bindings?: BindingConfiguration[];
  assets?: Record<string, unknown>;
  mcpEnabled?: boolean;
}

export interface DeploymentResult {
  workerUrl?: string;
  mcpUrl?: string;
  versionId?: string;
  instanceId?: string;
  deploymentId?: string;
  status: "success" | "failed";
  error?: string;
  bindings?: Array<{
    name: string;
    type: BindingType;
  }>;
}

export interface DeploymentProgress {
  step: DeploymentStep;
  message: string;
  progress: number;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface DeploymentState {
  deploymentId: string;
  workflowId: string;
  status: DeploymentStatus;
  progress: DeploymentProgress[];
  result?: DeploymentResult;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export type DeploymentProgressCallback = (
  step: DeploymentStep,
  message: string,
  progress: number,
  data?: Record<string, unknown>
) => void;

export interface BindingDeploymentContext {
  client: {
    kv: {
      namespaces: {
        list(input: {
          account_id: string;
        }): Promise<{ result?: Array<{ id: string; title: string }> }>;
        create(input: {
          account_id: string;
          title: string;
        }): Promise<{ id: string }>;
      };
    };
    d1?: {
      databases?: {
        list?(input: {
          account_id: string;
          name?: string;
          page?: number;
          per_page?: number;
        }): Promise<{
          result?: Array<{
            created_at: string;
            name: string;
            uuid: string;
            version: string;
          }>;
          result_info?: {
            count: number;
            page: number;
            per_page: number;
            total_count: number;
          };
        }>;
        create?(input: {
          account_id: string;
          name: string;
        }): Promise<{ uuid: string; name: string }>;
      };
    };
  };
  accountId: string;
  apiToken: string;
  className?: string;
  workflowName?: string;
}

export interface CloudflareWorkerConfig {
  name: string;
  main: string;
  compatibility_date: string;
  kv_namespaces?: Array<{ binding: string; id: string; preview_id?: string }>;
  d1_databases?: Array<{
    binding: string;
    database_name: string;
    database_id: string;
  }>;
  r2_buckets?: Array<{ binding: string; bucket_name: string }>;
  ai?: { binding: string };
  services?: Array<{ binding: string; service: string }>;
  durable_objects?: {
    bindings: Array<{ name: string; class_name: string; script_name: string }>;
  };
}

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

export interface TailSessionOptions {
  workflowName: string;
  instanceId: string;
  filters?: {
    level?: string;
    search?: string;
  };
}

export interface TailSessionResult {
  url: string;
  sessionId: string;
  expiresAt: string;
  token?: string;
}

export interface AIGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  includeCatalog?: boolean;
}

export interface AIGenerationRequest {
  text?: string;
  image?: string;
  options?: AIGenerationOptions;
}

export interface AIGenerationResponse {
  workflow: {
    id: string;
    name: string;
    description: string;
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: {
        label: string;
        type: string;
        config?: Record<string, unknown>;
      };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  };
  confidence?: number;
  reasoning?: string;
}

export interface AIGatewayConfig {
  url: string;
  token: string;
  timeout?: number;
  maxRetries?: number;
}

export interface WorkflowStarter {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  workflow: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      config?: Record<string, unknown>;
    }>;
    edges: Array<{
      source: string;
      target: string;
      sourceHandle?: string;
    }>;
  };
}
