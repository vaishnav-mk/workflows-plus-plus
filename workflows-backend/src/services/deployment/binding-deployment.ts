import type {
  BindingConfiguration,
  BindingDeploymentContext
} from "./types";
import { BindingType, ErrorCode } from "../../core/enums";
import { DeploymentError } from "./errors";
import { logger } from "../../core/logging/logger";
import { CLOUDFLARE } from "../../core/constants";

export async function transformBindingsForAPI(
  ctx: BindingDeploymentContext,
  bindings: BindingConfiguration[]
): Promise<Array<Record<string, unknown>>> {
  const transformedResults = await Promise.all(
    bindings.map(async binding => {
      const bindingName = binding.name;
      const internalType = binding.type;

      switch (internalType) {
        case BindingType.KV: {
          // For KV bindings, bindingName is now the actual namespace name (title)
          // Use it directly to find/create the namespace
          const namespaceId =
            binding.id ||
            (await findOrCreateKVNamespace(ctx, bindingName));

          return {
            type: "kv_namespace",
            name: bindingName,
            namespace_id: namespaceId
          } as Record<string, unknown>;
        }

        case BindingType.D1: {
          // Use the database name from the binding if available, otherwise use binding name
          const databaseName = binding.databaseName || bindingName;
          
          const databaseId =
            binding.id ||
            (await findOrCreateD1Database(
              ctx,
              databaseName
            ));

          if (!databaseId) {
            logger.warn("Skipping D1 binding - failed to get database_id", {
              name: bindingName,
              databaseName
            });
            return null as Record<string, unknown> | null;
          }

          // Sanitize the binding name to match how it's used in generated code
          // The codegen uses: (config.database || BINDING_NAMES.DEFAULT_D1).replace(/[^a-zA-Z0-9_]/g, "_")
          const sanitizedBindingName = databaseName.replace(/[^a-zA-Z0-9_]/g, "_");
          
          // Use the sanitized database name as the binding name to match the code
          return {
            type: "d1",
            name: sanitizedBindingName,
            id: databaseId
          } as Record<string, unknown>;
        }

        case BindingType.R2: {
          return {
            type: "r2_bucket",
            name: bindingName,
            bucket_name: binding.bucketName || bindingName
          } as Record<string, unknown>;
        }

        case BindingType.AI: {
          return {
            type: "ai",
            name: bindingName
          } as Record<string, unknown>;
        }

        case BindingType.SERVICE: {
          if (!binding.serviceName) {
            logger.warn("Skipping SERVICE binding - no service name provided", {
              name: bindingName
            });
            return null as Record<string, unknown> | null;
          }

          return {
            type: "service",
            name: bindingName,
            service: binding.serviceName
          } as Record<string, unknown>;
        }

        case BindingType.DURABLE_OBJECT: {
          const workflowClassName = ctx.className;
          if (!workflowClassName) {
            logger.warn("Skipping DURABLE_OBJECT binding - no class name provided", {
              name: bindingName
            });
            return null as Record<string, unknown> | null;
          }

          const isMcpBinding = bindingName.toUpperCase().includes("MCP");
          const durableObjectClassName = isMcpBinding 
            ? `${workflowClassName}MCP`
            : workflowClassName;
          const durableObjectBindingName = isMcpBinding ? "MCP_OBJECT" : bindingName;

          return {
            type: "durable_object_namespace",
            name: durableObjectBindingName,
            class_name: durableObjectClassName
          } as Record<string, unknown>;
        }

        case BindingType.WORKFLOW: {
          // Expose workflow bindings as real Cloudflare "workflow" bindings so
          // they appear alongside other bindings. These bindings allow Workers
          // to target specific Workflows.
          const workflowName = ctx.workflowName || bindingName;
          const result: Record<string, unknown> = {
            type: "workflow",
            name: bindingName,
            workflow_name: workflowName
          };
          if (ctx.className) {
            result.class_name = ctx.className;
          }
          return result;
        }

        default: {
          logger.warn("Unknown binding type, using default transformation", {
            type: internalType,
            name: bindingName
          });
          const result: Record<string, unknown> = {
            name: bindingName
          };
          if (binding.id) result.id = binding.id;
          if (binding.databaseName) result.database_name = binding.databaseName;
          if (binding.bucketName) result.bucket_name = binding.bucketName;
          if (binding.serviceName) result.service = binding.serviceName;
          return result;
        }
      }
    })
  );

  return transformedResults.filter(
    (item): item is Record<string, unknown> => item !== null
  );
}

async function findOrCreateKVNamespace(
  ctx: BindingDeploymentContext,
  title: string
): Promise<string> {
  try {
    const namespaces = await ctx.client.kv.namespaces.list({
      account_id: ctx.accountId
    });

    const existing = namespaces.result?.find(
      (ns: { id: string; title: string }) => ns.title === title
    );
    if (existing) {
      return existing.id;
    }

    const newNamespace = await ctx.client.kv.namespaces.create({
      account_id: ctx.accountId,
      title
    });

    logger.info("KV namespace created", { id: newNamespace.id, title });
    return newNamespace.id;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error(
      "Failed to find or create KV namespace",
      error instanceof Error ? error : new Error(errorMessage),
      { title }
    );
    throw new DeploymentError(
      ErrorCode.BINDING_ERROR,
      `Failed to find or create KV namespace: ${errorMessage}`,
      { title }
    );
  }
}

async function findOrCreateD1Database(
  ctx: BindingDeploymentContext,
  databaseName: string
): Promise<string | null> {
  try {
    // Use direct fetch to Cloudflare API instead of client interface
    const params = new URLSearchParams({
      page: "1",
      per_page: "1000",
    });
    if (databaseName) {
      params.append("name", databaseName);
    }

    // List D1 databases
    const listResponse = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${ctx.accountId}/d1/database?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ctx.apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText) as { message?: string; errors?: Array<{ message?: string }> };
      } catch {
        errorData = { message: errorText || `HTTP ${listResponse.status}` };
      }
      throw new Error(errorData.message || errorData.errors?.[0]?.message || `HTTP ${listResponse.status}`);
    }

    const listData = await listResponse.json() as { 
      result?: Array<{ 
        created_at: string;
        name: string;
        uuid: string;
        version: string;
      }>;
      result_info?: {
        count: number;
        page: number;
        per_page: number;
        total_count: number;
      };
    };

    // Check if database already exists
    const existing = listData.result?.find(
      (db: { name: string; uuid: string }) => db.name === databaseName
    );
    if (existing) {
      logger.info("D1 database found", { 
        uuid: existing.uuid, 
        name: databaseName 
      });
      return existing.uuid;
    }

    // Create new D1 database if it doesn't exist
    const createResponse = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${ctx.accountId}/d1/database`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: databaseName }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText) as { message?: string; errors?: Array<{ message?: string }> };
      } catch {
        errorData = { message: errorText || `HTTP ${createResponse.status}` };
      }
      throw new Error(errorData.message || errorData.errors?.[0]?.message || `HTTP ${createResponse.status}`);
    }

    const createData = await createResponse.json() as { 
      result?: { uuid: string; name: string };
      uuid?: string;
      name?: string;
    };

    const uuid = createData.result?.uuid || createData.uuid;
    if (!uuid) {
      throw new Error("Failed to get database UUID from create response");
    }

    logger.info("D1 database created", { 
      uuid, 
      name: databaseName 
    });
    return uuid;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error(
      "Failed to find or create D1 database",
      error instanceof Error ? error : new Error(errorMessage),
      { databaseName }
    );
    throw new DeploymentError(
      ErrorCode.BINDING_ERROR,
      `Failed to find or create D1 database: ${errorMessage}`,
      { databaseName }
    );
  }
}


