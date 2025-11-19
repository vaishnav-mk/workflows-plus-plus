import { Context } from "hono";
import { WorkflowService } from "../services/workflowService";
import { ValidationService } from "../services/validationService";
import { CodegenService } from "../services/codegenService";
import {
  CreateWorkflowRequest
} from "../types/workflow";
import { ApiResponse } from "../types/api";
import { WorkflowDeployService } from "../services/workflowDeployService";

export class WorkflowController {
  constructor(
    private workflowService: WorkflowService,
    private validationService: ValidationService,
    private codegenService: CodegenService
  ) {}


  async createWorkflow(c: Context): Promise<Response> {
    try {
      const workflowData: CreateWorkflowRequest = await c.req.json();

      const validation = this.validationService.validateWorkflow(workflowData);
      if (!validation.valid) {
        return c.json(
          {
            success: false,
            error: "Validation failed",
            message: validation.errors.join(", ")
          },
          400
        );
      }

      const workflow = await this.workflowService.createWorkflow(workflowData);

      const response: ApiResponse = {
        success: true,
        data: workflow,
        message: "Workflow created successfully"
      };

      return c.json(response, 201);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to create workflow",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }


  async validateWorkflow(c: Context): Promise<Response> {
    try {
      const workflowData = await c.req.json();
      const validation = this.validationService.validateWorkflow(workflowData);

      const response: ApiResponse = {
        success: true,
        data: validation,
        message: "Workflow validation completed"
      };

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to validate workflow",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }

  async generateCode(c: Context): Promise<Response> {
    try {
      const workflowData = await c.req.json();

      const validation = this.validationService.validateWorkflow(workflowData);
      if (!validation.valid) {
        return c.json(
          {
            success: false,
            error: "Cannot generate code for invalid workflow",
            message: validation.errors.join(", ")
          },
          400
        );
      }

      const hasMCP = workflowData.mcpConfig?.enabled || workflowData.nodes?.some((n: any) => n.type === 'mcp-tool-input');
      let codeResult;
      
      if (hasMCP) {
        const baseResult = this.codegenService.generateWorkerCode(workflowData as any);
        const mcpCode = this.codegenService.generateMCPWorkerCode(workflowData as any);
        codeResult = {
          ...baseResult,
          workerTs: mcpCode
        };
      } else {
        codeResult = this.codegenService.generateWorkerCode(workflowData as any);
      }

      const response: ApiResponse = {
        success: true,
        data: codeResult,
        message: "Code generated successfully"
      };

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to generate code",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }

  async deployWorkflow(c: Context): Promise<Response> {
    try {
      const id = c.req.param("id");
      console.log(`[Deploy] Starting deployment for workflow ID: ${id}`);
      
      if (!id) {
        console.log(`[Deploy] Error: Workflow ID is required`);
        return c.json(
          { success: false, error: "Workflow ID is required" },
          400
        );
      }

      console.log(`[Deploy] Fetching workflow from database...`);
      const workflow = await this.workflowService.getWorkflowById(id);
      if (!workflow) {
        console.log(`[Deploy] Error: Workflow not found`);
        return c.json({ success: false, error: "Workflow not found" }, 404);
      }
      console.log(`[Deploy] Workflow found: ${workflow.name || 'unnamed'}`);

      const bodyForGen = await c.req.json().catch(() => ({}));
      const desiredName = bodyForGen?.workflowName;
      
      console.log(`[Deploy] Checking for MCP configuration...`);
      const hasMCP = workflow.mcpConfig?.enabled || workflow.nodes?.some(n => n.type === 'mcp-tool-input');
      let codeArtifacts;
      
      if (hasMCP) {
        console.log(`[Deploy] Generating code with MCP support...`);
        const baseResult = this.codegenService.generateWorkerCode(workflow, { desiredWorkflowName: desiredName });
        const mcpCode = this.codegenService.generateMCPWorkerCode(workflow, { desiredWorkflowName: desiredName });
        codeArtifacts = {
          ...baseResult,
          workerTs: mcpCode
        };
      } else {
        console.log(`[Deploy] Generating standard worker code...`);
        codeArtifacts = this.codegenService.generateWorkerCode(workflow, { desiredWorkflowName: desiredName });
      }
      console.log(`[Deploy] Code generation completed`);

      // Use workflow ID as base for unique name, fallback to sanitized workflow name
      const workflowIdSanitized = id.replace(/[^a-z0-9-]/g, '-').substring(0, 32);
      const workflowNameFromDb = (workflow.name || "workflow")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");
      const body = bodyForGen;
      // Prefer provided name, then use workflow name with ID to ensure uniqueness
      const workflowApiName = body.workflowName || `${workflowNameFromDb}-${workflowIdSanitized}`;
      const scriptName = body.scriptName || `${workflowApiName}-worker`;
      const className = body.className || codeArtifacts.className;
      
      console.log(`[Deploy] Deployment configuration:`);
      console.log(`[Deploy]   Workflow API Name: ${workflowApiName}`);
      console.log(`[Deploy]   Script Name: ${scriptName}`);
      console.log(`[Deploy]   Class Name: ${className}`);
      
      const deployService = new WorkflowDeployService({
        apiToken: (c.env as any).CF_API_TOKEN,
        accountId: (c.env as any).CF_ACCOUNT_ID,
        subdomain: body.subdomain
      });
      
      console.log(`[Deploy] Starting Cloudflare deployment process...`);
      const result = await deployService.deployAndTrigger({
        workflowName: workflowApiName,
        className,
        scriptName,
        subdomain: body.subdomain,
        scriptContent: codeArtifacts.workerTs,
        // Prefer client-provided bindings; otherwise use codegen-discovered bindings
        bindings: body.bindings ?? (codeArtifacts as any).bindings,
        // Optional assets (e.g., for 'assets' bindings)
        assets: body.assets
      });

      console.log(`[Deploy] Deployment completed successfully`);
      console.log(`[Deploy]   Worker URL: ${result.workerUrl || 'N/A'}`);
      console.log(`[Deploy]   Version ID: ${result.versionId || 'N/A'}`);
      console.log(`[Deploy]   Instance ID: ${result.instanceId || 'N/A'}`);

      return c.json({
        success: true,
        data: {
          workflow: { workflowApiName, className, scriptName },
          deployment: {
            url: result.workerUrl,
            versionId: result.versionId,
            instanceId: result.instanceId
          }
        }
      });
    } catch (error) {
      console.log(`[Deploy] Deployment failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        console.log(`[Deploy] Error stack: ${error.stack}`);
      }
      return c.json(
        {
          success: false,
          error: "Failed to deploy workflow",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }
}
