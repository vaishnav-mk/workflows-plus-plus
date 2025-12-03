import type {
  BindingConfiguration,
  BindingDeploymentContext
} from "./types";
import { BindingType, ErrorCode } from "../../core/enums";
import { DeploymentError } from "./errors";
import { logger } from "../../core/logging/logger";

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
          const namespaceId =
            binding.id ||
            (await findOrCreateKVNamespace(ctx, `${bindingName} Namespace`));

          return {
            type: "kv_namespace",
            name: bindingName,
            namespace_id: namespaceId
          } as Record<string, unknown>;
        }

        case BindingType.D1: {
          if (!binding.id) {
            logger.warn("Skipping D1 binding - no database_id provided", {
              name: bindingName
            });
            return null as Record<string, unknown> | null;
          }

          return {
            type: "d1_database",
            name: bindingName,
            database_id: binding.id
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


