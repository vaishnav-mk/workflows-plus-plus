export interface Env {
  WORKFLOWS_KV: KVNamespace;
  DB: D1Database;
  ENVIRONMENT: string;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
  AI_GATEWAY_URL: string;
  AI_GATEWAY_TOKEN: string;
}
