/**
 * Log Tail Service Types
 */

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

