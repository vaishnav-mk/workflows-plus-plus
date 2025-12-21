export const API_ENDPOINTS = {
  HEALTH: "/health",
  
  WORKFLOWS: "/api/workflows",
  WORKFLOW_BY_ID: (id: string) => `/api/workflows/${id}`,
  WORKFLOW_VALIDATE: "/api/workflows/validate",
  WORKFLOW_PREVIEW: "/api/workflows/preview",
  WORKFLOW_GENERATE: "/api/workflows/generate",
  WORKFLOW_DEPLOY: (id: string) => `/api/workflows/${id}/deploy`,
  
  CATALOG: "/api/catalog",
  CATALOG_NODE: (nodeType: string) => `/api/catalog/${nodeType}`,
  CATALOG_CATEGORIES: "/api/catalog/categories",
  
  COMPILER_COMPILE: "/api/compiler/compile",
  COMPILER_PREVIEW: "/api/compiler/preview",
  COMPILER_VALIDATE_BINDINGS: "/api/compiler/validate-bindings",
  COMPILER_RESOLVE_WORKFLOW: "/api/compiler/resolve-workflow",
  COMPILER_RESOLVE_NODE: (nodeId: string) => `/api/compiler/resolve-node/${nodeId}`,
  COMPILER_VALIDATE_TEMPLATES: "/api/compiler/validate-templates",
  
  NODES: "/api/nodes",
  NODES_EXECUTE: "/api/nodes/execute",
  NODES_VALIDATE: "/api/nodes/validate",
  
  INSTANCES: (workflowName: string) => `/api/workflows/${workflowName}/instances`,
  INSTANCE: (workflowName: string, instanceId: string) => 
    `/api/workflows/${workflowName}/instances/${instanceId}`,
  INSTANCE_LOGS: (workflowName: string, instanceId: string) =>
    `/api/workflows/${workflowName}/instances/${instanceId}/logs/tail-url`,
  
  WORKERS: "/api/workers",
  WORKER: (id: string) => `/api/workers/${id}`,
  
  VERSIONS: (workerId: string) => `/api/workers/${workerId}/versions`,
  VERSION: (workerId: string, versionId: string) => 
    `/api/workers/${workerId}/versions/${versionId}`
} as const;

export const DEFAULT_VALUES = {
  TIMEOUT: 150000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  STEP_NAME_PREFIX: "step",
  WORKFLOW_CLASS_SUFFIX: "Workflow",
  DEFAULT_WORKFLOW_NAME: "Untitled Workflow",
  DEFAULT_DESCRIPTION: "",
  MAX_FILE_SIZE_LINES: 200,
  CATALOG_MAX_SIZE_KB: 5
} as const;

export const VALIDATION_RULES = {
  MIN_NODE_ID_LENGTH: 1,
  MAX_NODE_ID_LENGTH: 100,
  MIN_WORKFLOW_NAME_LENGTH: 1,
  MAX_WORKFLOW_NAME_LENGTH: 100,
  MAX_NODES: 1000,
  MAX_EDGES: 5000
} as const;

export const CODE_GENERATION = {
  CLASS_NAME_PATTERN: (name: string) => {
    const sanitized = name
      .replace(/[^a-zA-Z0-9]/g, "")
      .replace(/^[0-9]/, "");
    return `${sanitized.charAt(0).toUpperCase() + sanitized.slice(1)}Workflow`;
  },
  STEP_NAME_PATTERN: (nodeId: string, label?: string) => {
    const base = label || nodeId;
    return base
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "step";
  },
  BINDING_NAME_PATTERN: (workflowName: string) => {
    return `${workflowName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_WORKFLOW`;
  },
  WRANGLER_COMPATIBILITY_DATE: "2025-11-30"
} as const;

export const BINDING_NAMES = {
  DEFAULT_KV: "KV",
  DEFAULT_D1: "DB",
  DEFAULT_R2: "R2",
  DEFAULT_AI: "AI"
} as const;

export const TEMPLATE_PATTERNS = {
  TEMPLATE_REGEX: /\{\{([^}]+)\}\}/g,
  STATE_PREFIX: "state.",
  NODE_ID_PATTERN: /^[a-z0-9-]+$/,
  PATH_SEPARATOR: "."
} as const;

export const FILE_NAMING = {
  NODE_FILE_SUFFIX: ".node.ts",
  CONTROLLER_SUFFIX: ".controller.ts",
  ROUTE_SUFFIX: ".routes.ts",
  SERVICE_SUFFIX: ".service.ts",
  HANDLER_SUFFIX: ".handler.ts"
} as const;

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

export const PUBLIC_ROUTES = [
  "/health",
  "/",
  "/api/setup",
  "/api/setup/stream",
  "/api/catalog",
  "/api/catalog/categories"
] as const;

export const PUBLIC_ROUTE_PREFIXES = [
  "/api/setup/",
  "/api/catalog/"
] as const;

export const CACHE_KEYS = {
  NODE_CATALOG: "node_catalog",
  NODE_SCHEMA: (nodeType: string) => `node_schema_${nodeType}`,
  WORKFLOW: (id: string) => `workflow_${id}`,
  RESOLVED_WORKFLOW: (id: string) => `resolved_workflow_${id}`,
  COMPILATION_PREVIEW: (id: string) => `compilation_preview_${id}`
} as const;

export const CACHE_TTL = {
  NODE_CATALOG: 5 * 60 * 1000, 
  NODE_SCHEMA: 60 * 60 * 1000, 
  WORKFLOW: 1 * 60 * 1000, 
  RESOLVED_WORKFLOW: 1 * 60 * 1000, 
  COMPILATION_PREVIEW: 1 * 60 * 1000 
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 10,
  MAX_PER_PAGE: 100
} as const;

export const CLOUDFLARE = {
  API_BASE: "https://api.cloudflare.com/client/v4",
  DEFAULT_SUBDOMAIN: "workers.dev",
  WORKER_EXISTS_ERROR_CODE: 10013,
  DEPLOYMENT_STRATEGY: "percentage",
  DEPLOYMENT_PERCENTAGE: 100,
  TAIL_SESSION_TTL_MS: 3600000 
} as const;

export const MESSAGES = {
  WORKFLOWS_RETRIEVED: "Workflows retrieved successfully",
  WORKFLOW_CREATED: "Workflow created successfully",
  WORKFLOW_UPDATED: "Workflow updated successfully",
  WORKFLOW_DELETED: "Workflow deleted successfully",
  WORKFLOW_RETRIEVED: "Workflow retrieved successfully",
  WORKFLOW_VALIDATED: "Workflow validation completed",
  WORKFLOW_DEPLOYED: "Workflow deployed successfully",
  INSTANCES_RETRIEVED: "Instances retrieved successfully",
  INSTANCE_RETRIEVED: "Instance retrieved successfully",
  TAIL_SESSION_CREATED: "Tail session created successfully",
  WORKERS_RETRIEVED: "Workers retrieved successfully",
  WORKER_RETRIEVED: "Worker retrieved successfully",
  VERSIONS_RETRIEVED: "Versions retrieved successfully",
  VERSION_RETRIEVED: "Version retrieved successfully",
  NODE_EXECUTED: "Node execution completed",
  NODE_VALIDATED: "Node validation completed",
  WORKFLOW_GENERATED: "Workflow generated successfully",
  COMPILATION_PREVIEWED: "Compilation preview generated successfully",
  BINDINGS_VALIDATED: "Bindings validated successfully",
  TEMPLATES_VALIDATED: "Templates validated successfully",
  DATABASES_RETRIEVED: "Databases retrieved successfully",
  QUERY_VALIDATED: "Query validated successfully"
} as const;

export const AI_GATEWAY = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  TIMEOUT_MS: 150000,
  MAX_TOKENS: 4096,
  DEFAULT_TEMPERATURE: 0.7,
  EXPERIMENTAL_TELEMETRY: false
} as const;

export const LOGGING = {
  DEFAULT_LEVEL: "INFO",
  MAX_LOG_SIZE: 10000,
  ENABLE_REQUEST_LOGGING: true,
  ENABLE_RESPONSE_LOGGING: true,
  ENABLE_PERFORMANCE_LOGGING: true
} as const;

export const RATE_LIMIT = {
  WINDOW_MS: 60000,
  CALL_TYPE: {
    D1_READ: "d1_read",
    D1_WRITE: "d1_write",
    D1_QUERY: "d1_query",
    KV_READ: "kv_read",
    KV_WRITE: "kv_write",
    R2_READ: "r2_read",
    R2_WRITE: "r2_write",
    R2_LIST: "r2_list",
    WORKFLOW_READ: "workflow_read",
    WORKFLOW_WRITE: "workflow_write",
    WORKFLOW_DEPLOY: "workflow_deploy",
    WORKER_READ: "worker_read",
    WORKER_WRITE: "worker_write",
    INSTANCE_READ: "instance_read",
    COMPILER_COMPILE: "compiler_compile",
    COMPILER_PREVIEW: "compiler_preview",
    COMPILER_VALIDATE: "compiler_validate",
    COMPILER_RESOLVE: "compiler_resolve",
    COMPILER_REVERSE: "compiler_reverse",
    AI_GENERATE: "ai_generate",
    NODE_EXECUTE: "node_execute",
    NODE_VALIDATE: "node_validate",
    CATALOG_READ: "catalog_read",
    STARTER_READ: "starter_read",
    DEPLOYMENT_STREAM: "deployment_stream",
    DEPLOYMENT_STATUS: "deployment_status",
    SETUP: "setup"
  },
  LIMITS: {
    d1_read: 100,
    d1_write: 50,
    d1_query: 200,
    kv_read: 200,
    kv_write: 100,
    r2_read: 100,
    r2_write: 50,
    r2_list: 100,
    workflow_read: 200,
    workflow_write: 50,
    workflow_deploy: 10,
    worker_read: 200,
    worker_write: 50,
    instance_read: 200,
    compiler_compile: 50,
    compiler_preview: 50,
    compiler_validate: 100,
    compiler_resolve: 100,
    compiler_reverse: 20,
    ai_generate: 10,
    node_execute: 100,
    node_validate: 200,
    catalog_read: 500,
    starter_read: 500,
    deployment_stream: 50,
    deployment_status: 200,
    setup: 20
  }
} as const;
