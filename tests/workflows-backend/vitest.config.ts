import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { 
          configPath: "../../workflows-backend/wrangler.jsonc",
          compatibilityDate: "2025-10-11"
        },
        miniflare: {
          compatibilityDate: "2025-10-11",
          compatibilityFlags: ["nodejs_compat"],
          kvNamespaces: ["WORKFLOWS_KV"],
          d1Databases: ["DB"],
          durableObjects: {
            DEPLOYMENT_DO: "DeploymentDurableObject"
          },
          vars: {
            ENVIRONMENT: "test",
            // Use test master key for credential encryption/decryption
            CREDENTIALS_MASTER_KEY:
              "test-master-key-for-credentials-encryption-12345",
            // Actual Cloudflare credentials for testing
            CF_API_TOKEN: "y8WYQMwuNQ-2nDDQYsxPeB6Q5hzR601I7zPpXYDC",
            CF_ACCOUNT_ID: "c714a393dbfabeb858a7dea729b5e8f8"
          }
        }
      }
    }
  }
});
