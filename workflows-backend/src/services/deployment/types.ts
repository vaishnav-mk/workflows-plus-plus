import {
  BindingType,
  DeploymentStatus,
  DeploymentStep
} from "../../core/enums";

/**
 * Public deployment options passed from the API layer into the deployment
 * workflow (Cloudflare worker + workflow instance).
 */
export interface DeploymentOptions {
  workflowName: string;
  className: string;
  scriptName: string;
  scriptContent: string;
  subdomain?: string;
  bindings?: BindingConfiguration[];
  assets?: Record<string, unknown>;
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

export interface DeploymentResult {
  workerUrl?: string;
  /**
   * Convenience URL pointing at the MCP endpoint for this workflow worker
   * (e.g. https://<workerName>.<subdomain>.workers.dev/mcp).
   */
  mcpUrl?: string;
  versionId?: string;
  instanceId?: string;
  deploymentId?: string;
  status: "success" | "failed";
  error?: string;
  /**
   * Resolved bindings that were applied during deployment (names and types),
   * useful for displaying in the dashboard alongside the deployment result.
   */
  bindings?: Array<{
    name: string;
    type: BindingType;
  }>;
}

/**
 * Progress entry for a single deployment step.
 * Used by the Durable Object and surfaced over SSE to the dashboard.
 */
export interface DeploymentProgress {
  step: DeploymentStep;
  message: string;
  progress: number; // 0–100
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * Aggregate state of a deployment, persisted in the Durable Object.
 */
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

/**
 * Progress reporting callback used by low‑level deployment operations.
 */
export type DeploymentProgressCallback = (
  step: DeploymentStep,
  message: string,
  progress: number,
  data?: Record<string, unknown>
) => void;

export interface BindingDeploymentContext {
  // Narrow Cloudflare KV client surface used for bindings; keeps this file
  // decoupled from the concrete Cloudflare SDK types.
  client: {
    kv: {
      namespaces: {
        list(input: {
          account_id: string;
        }): Promise<{
          result?: Array<{ id: string; title: string }>;
        }>;
        create(input: {
          account_id: string;
          title: string;
        }): Promise<{ id: string }>;
      };
    };
  };
  accountId: string;
  className?: string;
  /**
   * The Cloudflare Workflow API name (sanitized workflowName) that this
   * deployment is associated with. Used for WORKFLOW bindings.
   */
  workflowName?: string;
}

export interface CloudflareWorkerConfig {
  name: string;
  main: string;
  compatibility_date: string;
  kv_namespaces?: Array<{
    binding: string;
    id: string;
    preview_id?: string;
  }>;
  d1_databases?: Array<{
    binding: string;
    database_name: string;
    database_id: string;
  }>;
  r2_buckets?: Array<{
    binding: string;
    bucket_name: string;
  }>;
  ai?: {
    binding: string;
  };
  services?: Array<{
    binding: string;
    service: string;
  }>;
  durable_objects?: {
    bindings: Array<{
      name: string;
      class_name: string;
      script_name: string;
    }>;
  };
}
