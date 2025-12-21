export enum NodeCategory {
  CONTROL = "control",
  HTTP = "http",
  STORAGE = "storage",
  DATABASE = "database",
  TRANSFORM = "transform",
  TIMING = "timing",
  AI = "ai",
  MESSAGING = "messaging"
}

export enum NodeType {
  ENTRY = "entry",
  RETURN = "return",
  HTTP_REQUEST = "http-request",
  TRANSFORM = "transform",
  SLEEP = "sleep",
  CONDITIONAL_ROUTER = "conditional-router",
  WAIT_EVENT = "wait-event",
  KV_GET = "kv-get",
  KV_PUT = "kv-put",
  R2_GET = "r2-get",
  R2_PUT = "r2-put",
  D1_QUERY = "d1-query",
  MCP_TOOL_INPUT = "mcp-tool-input",
  MCP_TOOL_OUTPUT = "mcp-tool-output",
  WORKERS_AI = "workers-ai",
  FOR_EACH = "for-each",
  VALIDATE = "validate"
}

export enum DataType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  OBJECT = "object",
  ARRAY = "array",
  ANY = "any"
}

export enum DeploymentStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  SUCCESS = "success",
  FAILED = "failed",
  COMPLETED = "completed"
}

export enum DeploymentStep {
  INITIALIZING = "initializing",
  CREATING_WORKER = "creating_worker",
  WORKER_CREATED = "worker_created",
  TRANSFORMING_BINDINGS = "transforming_bindings",
  BINDINGS_TRANSFORMED = "bindings_transformed",
  CREATING_VERSION = "creating_version",
  VERSION_CREATED = "version_created",
  DEPLOYING = "deploying",
  DEPLOYMENT_CREATED = "deployment_created",
  UPDATING_WORKFLOW = "updating_workflow",
  WORKFLOW_UPDATED = "workflow_updated",
  CREATING_INSTANCE = "creating_instance",
  COMPLETED = "completed",
  FAILED = "failed"
}

export enum InstanceStatus {
  QUEUED = "queued",
  RUNNING = "running",
  PAUSED = "paused",
  ERRORED = "errored",
  TERMINATED = "terminated",
  COMPLETE = "complete",
  WAITING = "waiting",
  WAITING_FOR_PAUSE = "waitingForPause",
  UNKNOWN = "unknown"
}

export enum ToastType {
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info"
}

export enum LoaderVariant {
  SPINNER = "spinner",
  SKELETON = "skeleton",
  OVERLAY = "overlay",
  INLINE = "inline"
}

export enum LoaderSize {
  SM = "sm",
  MD = "md",
  LG = "lg"
}

export enum StepStatus {
  PENDING = "pending",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error"
}

export enum EdgeType {
  CONTROL = "control",
  DATA = "data",
  CONDITIONAL_TRUE = "conditional-true",
  CONDITIONAL_FALSE = "conditional-false",
  LOOP = "loop",
  ERROR = "error",
  PARALLEL = "parallel",
  STEP = "step"
}

export enum ValidationSeverity {
  ERROR = "error",
  WARNING = "warning"
}

export enum RetryDelayUnit {
  MS = "ms",
  SECONDS = "seconds",
  MINUTES = "minutes"
}

export enum RetryBackoff {
  LINEAR = "linear",
  EXPONENTIAL = "exponential"
}

