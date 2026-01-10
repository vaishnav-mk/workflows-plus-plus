import { Hono } from "hono";
import { z } from "zod";
import { WorkflowCompiler } from "../../services/compiler/workflow-compiler";
import { WorkflowValidator } from "../../services/compiler/workflow-validator";
import { runPromise } from "../../core/effect/runtime";
import { HTTP_STATUS_CODES, DEFAULT_VALUES, MESSAGES, PAGINATION } from "../../core/constants";
import { BindingType } from "../../core/enums";
import { createPaginationResponse } from "../../core/utils/pagination";
import { logger } from "../../core/logging/logger";
import { generateWorkflowId, generateClassName } from "../../core/utils/id-generator";
import { BindingConfiguration } from "../../core/types";
import { CredentialsContext } from "../../core/types";
import {
  PaginationQuerySchema,
  IdParamSchema,
  WorkflowValidateSchema,
  WorkflowDeploySchema
} from "../../core/validation/schemas";
import { safe } from "../../core/utils/route-helpers";
import { zValidator } from "../../api/middleware/validation.middleware";
import { rateLimitMiddleware } from "../../api/middleware/rate-limit.middleware";
import { CloudflareContext, WorkflowEdge } from "../../core/types";

interface WorkflowEnv {
  ENVIRONMENT?: string;
  DEPLOYMENT_DO?: DurableObjectNamespace;
  [key: string]: unknown;
}

function normalizeEdges(edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>): WorkflowEdge[] {
  return edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined
  }));
}

function processWorkflowBindings(
  bindingsArray: any[],
  nodes: any[]
): BindingConfiguration[] {
  const d1Nodes = nodes.filter(n =>
    (n.type === 'd1-query' || n.data?.type === 'd1-query') && n.config?.database_id
  );

  const kvNodes = nodes.filter(n =>
    ((n.type === 'kv_get' || n.type === 'kv_put') ||
     (n.data?.type === 'kv_get' || n.data?.type === 'kv_put')) && n.config?.namespace_id
  );

  const r2Nodes = nodes.filter(n =>
    ((n.type === 'r2-get' || n.type === 'r2-put' || n.type === 'r2-list') ||
     (n.data?.type === 'r2-get' || n.data?.type === 'r2-put' || n.data?.type === 'r2-list')) && n.config?.bucket
  );

  return bindingsArray.map((b: { name: string; type: string; id?: string; databaseName?: string; bucketName?: string }) => {
    if (b.type === BindingType.D1) {
      const matchingNode = d1Nodes.find(n => {
        const nodeDb = n.config?.database || n.data?.config?.database;
        return nodeDb === b.name || nodeDb === b.databaseName;
      });

      if (matchingNode) {
        const nodeConfig = matchingNode.config || matchingNode.data?.config;
        const dbName = nodeConfig?.database || b.databaseName || b.name;
        const sanitizedBindingName = dbName.replace(/[^a-zA-Z0-9_]/g, "_");

        return {
          name: sanitizedBindingName,
          type: b.type as BindingType,
          id: nodeConfig?.database_id || b.id,
          databaseName: dbName
        };
      }
    }

    if (b.type === BindingType.R2) {
      const matchingNode = r2Nodes.find(n => {
        const nodeBucket = n.config?.bucket || n.data?.config?.bucket;
        return nodeBucket === b.name || nodeBucket === b.bucketName;
      });

      if (matchingNode) {
        const nodeConfig = matchingNode.config || matchingNode.data?.config;
        const bucketName = nodeConfig?.bucket || b.bucketName || b.name;
        const sanitizedBindingName = bucketName.replace(/[^a-zA-Z0-9_]/g, "_");

        return {
          name: sanitizedBindingName,
          type: b.type as BindingType,
          bucketName
        };
      }
    }

    if (b.type === BindingType.KV) {
      const matchingNode = kvNodes.find(n => {
        const nodeNs = n.config?.namespace || n.data?.config?.namespace;
        return nodeNs === b.name;
      });

      if (matchingNode) {
        const nodeConfig = matchingNode.config || matchingNode.data?.config;
        const nsName = nodeConfig?.namespace || b.name;
        const sanitizedBindingName = nsName.replace(/[^a-zA-Z0-9_]/g, "_");

        return {
          name: sanitizedBindingName,
          type: b.type as BindingType,
          id: nodeConfig?.namespace_id || b.id
        };
      }
    }

    return {
      name: b.name,
      type: b.type as BindingType,
      id: b.id,
      databaseName: b.databaseName,
      bucketName: b.bucketName
    };
  });
}

const app = new Hono<{
  Bindings: WorkflowEnv;
  Variables: { credentials: CredentialsContext } & CloudflareContext;
}>();

app.get("/", rateLimitMiddleware(), zValidator('query', PaginationQuerySchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const client = c.var.cloudflare;

  const { page = PAGINATION.DEFAULT_PAGE, per_page: perPage = PAGINATION.DEFAULT_PER_PAGE } = c.req.valid('query') as z.infer<typeof PaginationQuerySchema>;

  const workflows = await client.workflows.list({
    account_id: credentials.accountId,
    page,
    per_page: perPage
  });

  const response = createPaginationResponse(
    workflows.result || [],
    page,
    perPage,
    (workflows.result_info as any)?.total_count
  );
  response.message = MESSAGES.WORKFLOWS_RETRIEVED;

  return c.json(response, HTTP_STATUS_CODES.OK);
}));

app.post("/validate", rateLimitMiddleware(), zValidator('json', WorkflowValidateSchema), safe(async (c) => {
  const { nodes, edges } = c.req.valid('json') as z.infer<typeof WorkflowValidateSchema>;

  await runPromise(WorkflowValidator.validateWorkflow(nodes, edges));

  return c.json({
    success: true,
    data: { valid: true },
    message: MESSAGES.WORKFLOW_VALIDATED
  }, HTTP_STATUS_CODES.OK);
}));

app.post("/:id/deploy", rateLimitMiddleware(), zValidator('param', IdParamSchema), zValidator('json', WorkflowDeploySchema), safe(async (c) => {
  const { id } = c.req.valid('param') as z.infer<typeof IdParamSchema>;
  const credentials = c.var.credentials;
  const body = c.req.valid('json') as z.infer<typeof WorkflowDeploySchema>;

  const workflow = {
    id: id || generateWorkflowId(),
    name: body.workflowName || DEFAULT_VALUES.DEFAULT_WORKFLOW_NAME,
    nodes: Array.isArray(body.nodes) ? body.nodes : [],
    edges: normalizeEdges(Array.isArray(body.edges) ? body.edges : [])
  };

  const compilationResult = await runPromise(
    WorkflowCompiler.compile(workflow, {
      workflowId: workflow.id,
      desiredWorkflowName: body.workflowName
    })
  );

  const workflowName = body.workflowName || workflow.id;
  const scriptName = body.scriptName || `${workflowName}-worker`;
  const className = body.className || compilationResult.className || generateClassName(workflow.id);

  const bindingsArray = body.bindings ?? compilationResult.bindings ?? [];
  const bindings = processWorkflowBindings(bindingsArray, workflow.nodes);

  const hasMCPNodes = workflow.nodes.some(n => n.type === "mcp-tool-input" || n.type === "mcp-tool-output");
  const mcpEnabled = (body as any).mcpEnabled !== undefined ? (body as any).mcpEnabled : hasMCPNodes;

  if (hasMCPNodes) {
    logger.info("Workflow contains MCP nodes, enabling MCP bundles", {
      workflowId: id,
      mcpEnabled,
      explicitlySet: (body as any).mcpEnabled !== undefined
    });
  }

  const deploymentId = id.startsWith("workflow-") 
    ? id.replace("workflow-", "deployment-")
    : `deployment-${id}`;

  const deploymentDO = c.env.DEPLOYMENT_DO!;

  const deploymentDOId = deploymentDO.idFromName(deploymentId);
  const deploymentDOInstance = deploymentDO.get(deploymentDOId);

  const baseUrl = new URL(c.req.url);
  const deployRequest = new Request(`${baseUrl.origin}/deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deploymentId,
      workflowId: id,
      options: {
        workflowName,
        className,
        scriptName,
        subdomain: body.subdomain,
        scriptContent: compilationResult.tsCode,
        bindings,
        assets: body.assets,
        mcpEnabled
      },
      apiToken: credentials.apiToken,
      accountId: credentials.accountId,
      subdomain: body.subdomain
    })
  });

  deploymentDOInstance.fetch(deployRequest).catch((error: unknown) => {
    logger.error("Background deployment failed", error instanceof Error ? error : new Error(String(error)), {
      deploymentId,
      workflowId: id
    });
  });

  const registryId = deploymentDO.idFromName("deployment-registry");
  const registryInstance = deploymentDO.get(registryId);
  registryInstance.fetch(new Request(`${baseUrl.origin}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deploymentId })
  })).catch((error: unknown) => {
    logger.error("Failed to register deployment", error instanceof Error ? error : new Error(String(error)), {
      deploymentId
    });
  });

  logger.info("Deployment started", {
    workflowId: id,
    workflowName,
    deploymentId
  });

  return c.json({
    success: true,
    data: {
      deploymentId,
      workflow: { workflowApiName: workflowName, className, scriptName },
      message: "Deployment started. Connect to SSE endpoint to track progress."
    },
    message: "Deployment started"
  }, HTTP_STATUS_CODES.ACCEPTED);
}));

export default app;
