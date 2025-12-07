import type { Env } from "../../workflows-backend/worker-configuration";

declare module "cloudflare:test" {
  // ProvidedEnv controls the type of `import("cloudflare:test").env`
  interface ProvidedEnv extends Env {
    WORKFLOWS_KV: KVNamespace;
    DB: D1Database;
    DEPLOYMENT_DO: DurableObjectNamespace;
    ENVIRONMENT?: string;
    AI_GATEWAY_URL?: string;
    AI_GATEWAY_TOKEN?: string;
    CREDENTIALS_MASTER_KEY?: string;
    CF_API_TOKEN?: string;
    CF_ACCOUNT_ID?: string;
  }
}

