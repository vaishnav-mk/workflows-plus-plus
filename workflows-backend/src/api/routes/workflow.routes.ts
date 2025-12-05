/**
 * Workflow Routes
 */

import { Hono } from "hono";
import Cloudflare from "cloudflare";
import { WorkflowCompiler } from "../../services/compiler/workflow-compiler";
import { WorkflowValidator } from "../../services/compiler/workflow-validator";
import { runPromise } from "../../core/effect/runtime";
import { HTTP_STATUS_CODES, DEFAULT_VALUES, MESSAGES } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../core/api-contracts";
import { createPaginationResponse } from "../../core/utils/pagination";
import { logger } from "../../core/logging/logger";
import { generateWorkflowId, generateClassName } from "../../core/utils/id-generator";
import { BindingConfiguration } from "../../services/deployment/types";
import { BindingType } from "../../core/enums";
import { CredentialsContext } from "../../api/middleware/credentials.middleware";
import { validateBody, validateQuery, validateParams, validationErrorResponse } from "../../core/validation/validator";
import {
  PaginationQuerySchema,
  IdParamSchema,
  WorkflowValidateSchema,
  WorkflowDeploySchema
} from "../../core/validation/schemas";

interface Env {
  ENVIRONMENT?: string;
  DEPLOYMENT_DO?: DurableObjectNamespace;
  [key: string]: unknown;
}

interface ContextWithCredentials {
  Variables: {
    credentials: CredentialsContext;
  };
}

const app = new Hono<{ Bindings: Env } & ContextWithCredentials>();

// List all workflows from Cloudflare
app.get("/", async (c) => {
  try {
    logger.info("Listing workflows from Cloudflare");
    
    // Validate query parameters
    const queryValidation = validateQuery(c, PaginationQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }
    
    const credentials = c.var.credentials;

    const client = new Cloudflare({
      apiToken: credentials.apiToken
    });

    const page = queryValidation.data.page || 1;
    const perPage = queryValidation.data.per_page || 10;

    const workflows = await client.workflows.list({
      account_id: credentials.accountId,
      page,
      per_page: perPage
    });

    const totalCount = (workflows.result_info as { total_count?: number })?.total_count;
    const response = createPaginationResponse(
      workflows.result || [],
      page,
      perPage,
      totalCount
    );
    response.message = MESSAGES.WORKFLOWS_RETRIEVED;

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Failed to list workflows", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to fetch workflows",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Note: DB operations removed - workflows are stored in localStorage on frontend

// Validate workflow
app.post("/validate", async (c) => {
  try {
    logger.info("Validating workflow");
    
    // Validate request body
    const bodyValidation = await validateBody(c, WorkflowValidateSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }
    
    const workflowData = bodyValidation.data;

    await runPromise(
      WorkflowValidator.validateWorkflow(
        workflowData.nodes,
        workflowData.edges
      )
    );

    const response: ApiResponse = {
      success: true,
      data: { valid: true },
      message: MESSAGES.WORKFLOW_VALIDATED
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Workflow validation failed", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: true,
        data: {
          valid: false,
          errors: [error instanceof Error ? error.message : "Validation failed"]
        },
        message: MESSAGES.WORKFLOW_VALIDATED
      },
      HTTP_STATUS_CODES.OK
    );
  }
});

// Deploy workflow
app.post("/:id/deploy", async (c) => {
  try {
    // Validate path parameters
    const paramsValidation = validateParams(c, IdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const { id } = paramsValidation.data;
    logger.info("Deploying workflow", { workflowId: id });

    const credentials = c.var.credentials;

    // Validate request body - workflow data should be in body now
    const bodyValidation = await validateBody(c, WorkflowDeploySchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = bodyValidation.data;

    // Workflow data comes from request body (no DB)
    const workflow = {
      id: id || generateWorkflowId(),
      name: body.workflowName || DEFAULT_VALUES.DEFAULT_WORKFLOW_NAME,
      nodes: Array.isArray(body.nodes) ? body.nodes : [],
      edges: Array.isArray(body.edges) ? body.edges : []
    };

    // Compile workflow with standardized workflow ID
    const compilationResult = await runPromise(
      WorkflowCompiler.compile(workflow, {
        workflowId: workflow.id,
        desiredWorkflowName: body.workflowName
      })
    );

    // Use workflow ID as name (keep the full ID including "workflow-" prefix)
    // Example: workflow-ghost-beneficiary-bed -> workflow-ghost-beneficiary-bed
    const workflowName =
      body.workflowName ||
      workflow.id;
    const scriptName = body.scriptName || `${workflowName}-worker`;
    const className = body.className || compilationResult.className || generateClassName(workflow.id);

    // Convert bindings to BindingConfiguration format
    const bindingsArray = (body.bindings ?? compilationResult.bindings) || [];
    
    // Extract database_id from D1 node configs if not already in bindings
    const d1Nodes = (body.nodes || workflow.nodes || []).filter(
      (n: any) => (n.type === 'd1-query' || n.data?.type === 'd1-query') && n.config?.database_id
    );
    
    const bindings: BindingConfiguration[] = bindingsArray.map((b: { name: string; type: string; id?: string; databaseName?: string; bucketName?: string }) => {
      // If this is a D1 binding and we have a node with database_id, use it
      if (b.type === BindingType.D1) {
        const matchingNode = d1Nodes.find((n: any) => {
          const nodeDb = n.config?.database || n.data?.config?.database;
          return nodeDb === b.name || nodeDb === b.databaseName;
        });
        if (matchingNode) {
          const nodeConfig = matchingNode.config || matchingNode.data?.config;
          const dbName = nodeConfig?.database || b.databaseName || b.name;
          // Sanitize the binding name to match how it's used in generated code
          // The codegen uses: (config.database || BINDING_NAMES.DEFAULT_D1).replace(/[^a-zA-Z0-9_]/g, "_")
          const sanitizedBindingName = dbName.replace(/[^a-zA-Z0-9_]/g, "_");
          return {
            name: sanitizedBindingName, // Use the sanitized database name as the binding name to match the code
            type: b.type as BindingType,
            id: nodeConfig?.database_id || b.id,
            databaseName: dbName, // Keep original name for database creation/lookup
            bucketName: b.bucketName
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

    // Generate deployment ID from workflow ID (e.g., workflow-xxx -> deployment-xxx)
    const deploymentId = id.startsWith("workflow-") 
      ? id.replace("workflow-", "deployment-")
      : `deployment-${id}`;

    // Check if Durable Object is available
    const env = c.env;
    if (!env.DEPLOYMENT_DO) {
      logger.error("DEPLOYMENT_DO binding not configured");
      return c.json(
        {
          success: false,
          error: "Deployment Durable Object not configured",
          message: "DEPLOYMENT_DO binding is required for deployments",
          code: ErrorCode.DEPLOYMENT_ERROR
        },
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }

    // Start deployment via Durable Object
    const deploymentDOId = env.DEPLOYMENT_DO.idFromName(deploymentId);
    const deploymentDO = env.DEPLOYMENT_DO.get(deploymentDOId);

    // Start deployment asynchronously
    const baseUrl = new URL(c.req.url);
    const deployUrl = `${baseUrl.origin}/deploy`;
    const deployRequest = new Request(deployUrl, {
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
          mcpEnabled: body.mcpEnabled || false
        },
        apiToken: credentials.apiToken,
        accountId: credentials.accountId,
        subdomain: body.subdomain
      })
    });

    // Don't await - let it run in background
    deploymentDO.fetch(deployRequest).catch((error) => {
      logger.error("Background deployment failed", error instanceof Error ? error : new Error(String(error)), {
        deploymentId,
        workflowId: id
      });
    });

    logger.info("Deployment started", {
      workflowId: id,
      workflowName,
      deploymentId
    });

    return c.json(
      {
        success: true,
        data: {
          deploymentId,
          workflow: { workflowApiName: workflowName, className, scriptName },
          message: "Deployment started. Connect to SSE endpoint to track progress."
        },
        message: "Deployment started"
      },
      HTTP_STATUS_CODES.ACCEPTED
    );
  } catch (error) {
    logger.error("Workflow deployment failed", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Failed to deploy workflow",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.DEPLOYMENT_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;
