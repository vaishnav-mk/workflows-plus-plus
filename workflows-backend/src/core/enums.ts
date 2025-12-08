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

export enum BindingType {
  KV = "KV",
  D1 = "D1",
  R2 = "R2",
  AI = "AI",
  SERVICE = "SERVICE",
  DURABLE_OBJECT = "DURABLE_OBJECT",
  WORKFLOW = "WORKFLOW"
}

export enum DataType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  OBJECT = "object",
  ARRAY = "array",
  ANY = "any"
}

export enum WorkflowStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived"
}

export enum CompilationStatus {
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning"
}

export enum TemplateResolutionStatus {
  SUCCESS = "success",
  ERROR = "error",
  CIRCULAR_REF = "circular_ref",
  MISSING_NODE = "missing_node",
  INVALID_PATH = "invalid_path"
}

export enum ErrorCode {
  NODE_NOT_FOUND = "NODE_NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  COMPILATION_ERROR = "COMPILATION_ERROR",
  GRAPH_VALIDATION_ERROR = "GRAPH_VALIDATION_ERROR",
  BINDING_ERROR = "BINDING_ERROR",
  TEMPLATE_ERROR = "TEMPLATE_ERROR",
  CYCLE_DETECTED = "CYCLE_DETECTED",
  MISSING_ENTRY_NODE = "MISSING_ENTRY_NODE",
  INVALID_CONFIG = "INVALID_CONFIG",
  MISSING_BINDING = "MISSING_BINDING",
  DEPLOYMENT_ERROR = "DEPLOYMENT_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_FOUND = "NOT_FOUND",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  AI_GATEWAY_ERROR = "AI_GATEWAY_ERROR",
  EXECUTION_ERROR = "EXECUTION_ERROR",
  LOG_TAIL_ERROR = "LOG_TAIL_ERROR"
}

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR"
}

export enum DeploymentStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  SUCCESS = "success",
  FAILED = "failed"
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

export const DEPLOYMENT_STEPS_ORDER: DeploymentStep[] = [
  DeploymentStep.INITIALIZING,
  DeploymentStep.CREATING_WORKER,
  DeploymentStep.WORKER_CREATED,
  DeploymentStep.TRANSFORMING_BINDINGS,
  DeploymentStep.BINDINGS_TRANSFORMED,
  DeploymentStep.CREATING_VERSION,
  DeploymentStep.VERSION_CREATED,
  DeploymentStep.DEPLOYING,
  DeploymentStep.DEPLOYMENT_CREATED,
  DeploymentStep.UPDATING_WORKFLOW,
  DeploymentStep.WORKFLOW_UPDATED,
  DeploymentStep.CREATING_INSTANCE,
  DeploymentStep.COMPLETED
];

export enum CacheKey {
  NODE_CATALOG = "node_catalog",
  NODE_SCHEMA = "node_schema",
  WORKFLOW = "workflow",
  RESOLVED_WORKFLOW = "resolved_workflow",
  COMPILATION_PREVIEW = "compilation_preview",
  BINDINGS = "bindings",
  KV_NAMESPACES = "kv_namespaces",
  D1_DATABASES = "d1_databases"
}
