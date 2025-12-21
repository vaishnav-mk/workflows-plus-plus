export const WORKFLOW_DEFAULT_MAX_RETRIES = 3 as const;

export const WORKFLOW_DEFAULT_TIMEOUT_MS = 150000 as const;

export const workflowDefaults = {
  maxRetries: WORKFLOW_DEFAULT_MAX_RETRIES,
  timeoutMs: WORKFLOW_DEFAULT_TIMEOUT_MS,
} as const;

export type WorkflowDefaults = typeof workflowDefaults;
