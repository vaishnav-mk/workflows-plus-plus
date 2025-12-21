import type { CredentialsContext, CloudflareContext } from "../../core/types";

export interface ContextWithCredentials {
  Variables: {
    credentials: CredentialsContext;
  } & CloudflareContext;
}

export interface SetupEnv {
  ENVIRONMENT?: string;
  CREDENTIALS_MASTER_KEY?: string;
  TEST_API_TOKEN?: string;
  TEST_ACCOUNT_ID?: string;
  [key: string]: unknown;
}

export interface WorkflowEnv {
  [key: string]: unknown;
}

export interface Env {
  DEPLOYMENT_DO?: DurableObjectNamespace;
  AI_GATEWAY_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  [key: string]: unknown;
}

