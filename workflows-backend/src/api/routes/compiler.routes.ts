/**
 * Compiler Routes
 */

import { Hono } from "hono";
import { WorkflowCompiler } from "../../services/compiler/workflow-compiler";
import { TemplateResolver } from "../../services/compiler/template-resolver";
import { GraphAnalyzer } from "../../services/compiler/graph-analyzer";
import { runPromise } from "../../core/effect/runtime";
import { HTTP_STATUS_CODES, MESSAGES } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../core/api-contracts";
import { logger } from "../../core/logging/logger";
import { z } from "zod";
import { validateBody, validateParams, validationErrorResponse } from "../../core/validation/validator";
import {
  CompileRequestSchema,
  ResolveWorkflowSchema,
  ResolveNodeSchema,
  ValidateBindingsSchema,
  ValidateTemplatesSchema,
  ReverseCodegenSchema
} from "../../core/validation/schemas";
import { ReverseCodegen } from "../../services/compiler/reverse-codegen";

const app = new Hono();

// Compile workflow
app.post("/compile", async (c) => {
  try {
    // Validate request body
    const bodyValidation = await validateBody(c, CompileRequestSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }
    
    const workflow = bodyValidation.data;
    const options = workflow.options || {};

    const result = await runPromise(
      WorkflowCompiler.compile({
        name: workflow.name || "Untitled Workflow",
        nodes: workflow.nodes,
        edges: workflow.edges
      }, options)
    );

    return c.json(
      {
        success: true,
        data: result,
        message: "Compilation successful",
      },
      HTTP_STATUS_CODES.OK
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Compilation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Preview compilation without deploying
app.post("/preview", async (c) => {
  try {
    logger.info("Previewing compilation");
    
    // Validate request body
    const bodyValidation = await validateBody(c, CompileRequestSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }
    
    const workflow = bodyValidation.data;
    const options = workflow.options || {};

    const result = await runPromise(
      WorkflowCompiler.compile({
        name: workflow.name || "Untitled Workflow",
        nodes: workflow.nodes,
        edges: workflow.edges
      }, options)
    );

    const response: ApiResponse = {
      success: true,
      data: result,
      message: MESSAGES.COMPILATION_PREVIEWED
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Compilation preview failed", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Compilation preview failed",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.COMPILATION_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Validate bindings
app.post("/validate-bindings", async (c) => {
  try {
    logger.info("Validating bindings");
    
    // Validate request body
    const bodyValidation = await validateBody(c, ValidateBindingsSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }
    
    const { workflow, availableBindings } = bodyValidation.data;

    // Compile to get required bindings
    const compilationResult = await runPromise(
      WorkflowCompiler.compile({
        name: workflow.name || "Untitled Workflow",
        nodes: workflow.nodes,
        edges: workflow.edges
      }, {})
    );

    const required = compilationResult.bindings || [];
    const available = availableBindings || [];

    const missing = required.filter(
      (req) => !available.some((avail: { name: string; type: string }) => 
        avail.name === req.name && avail.type === req.type
      )
    );

    const response: ApiResponse = {
      success: true,
      data: {
        required,
        available,
        missing,
        valid: missing.length === 0
      },
      message: MESSAGES.BINDINGS_VALIDATED
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Binding validation failed", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Binding validation failed",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.BINDING_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Validate templates
app.post("/validate-templates", async (c) => {
  try {
    logger.info("Validating templates");
    
    // Validate request body
    const bodyValidation = await validateBody(c, ValidateTemplatesSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }
    
    const workflow = bodyValidation.data;

    const graphContext = await runPromise(
      GraphAnalyzer.buildGraphContext(workflow.nodes, workflow.edges)
    );

    const result = await runPromise(
      TemplateResolver.resolveWorkflow(workflow, graphContext)
    );

    const errors: Array<{ nodeId: string; expression: string; message: string }> = [];
    
    for (const node of result.nodes) {
      if (node.errors && node.errors.length > 0) {
        for (const error of node.errors) {
          errors.push({
            nodeId: node.id,
            expression: "",
            message: error
          });
        }
      }
    }

    const response: ApiResponse = {
      success: true,
      data: {
        valid: errors.length === 0,
        errors
      },
      message: MESSAGES.TEMPLATES_VALIDATED
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Template validation failed", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Template validation failed",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.TEMPLATE_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Resolve workflow templates
app.post("/resolve-workflow", async (c) => {
  try {
    // Validate request body
    const bodyValidation = await validateBody(c, ResolveWorkflowSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }
    
    const workflow = bodyValidation.data;
    
    const graphContext = await runPromise(
      GraphAnalyzer.buildGraphContext(workflow.nodes, workflow.edges)
    );

    const result = await runPromise(
      TemplateResolver.resolveWorkflow(workflow, graphContext)
    );

    return c.json(
      {
        success: true,
        data: result,
        message: "Templates resolved successfully",
      },
      HTTP_STATUS_CODES.OK
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Template resolution failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Resolve single node templates
app.post("/resolve-node/:nodeId", async (c) => {
  try {
    // Validate path parameters
    const paramsValidation = validateParams(c, z.object({ nodeId: z.string().min(1, "Node ID is required") }));
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const { nodeId } = paramsValidation.data;
    
    // Validate request body
    const bodyValidation = await validateBody(c, ResolveNodeSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }
    
    const { workflow } = bodyValidation.data;
    
    const graphContext = await runPromise(
      GraphAnalyzer.buildGraphContext(workflow.nodes, workflow.edges)
    );

    const node = workflow.nodes.find((n: { id: string }) => n.id === nodeId);
    if (!node) {
      return c.json(
        {
          success: false,
          error: "Node not found",
          message: `Node '${nodeId}' not found`,
        },
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }

    const config = node.config || node.data?.config || {};
    const resolvedConfig: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === "string" && value.includes("{{")) {
        const result = await runPromise(
          TemplateResolver.resolveTemplate(value, graphContext, nodeId)
        );
        resolvedConfig[key] = result.resolved;
      } else {
        resolvedConfig[key] = value;
      }
    }

    return c.json(
      {
        success: true,
        data: { nodeId, resolvedConfig },
        message: "Node templates resolved successfully",
      },
      HTTP_STATUS_CODES.OK
    );
  } catch (error) {
    logger.error("Template resolution failed", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Template resolution failed",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.TEMPLATE_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Reverse codegen - parse workflow code back to nodes and edges
app.post("/reverse-codegen", async (c) => {
  try {
    logger.info("Parsing workflow code");
    
    // Validate request body
    const bodyValidation = await validateBody(c, ReverseCodegenSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }
    
    const { code } = bodyValidation.data;

    const result = await runPromise(
      ReverseCodegen.parse(code)
    );

    const response: ApiResponse = {
      success: true,
      data: result,
      message: "Workflow code parsed successfully",
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error("Reverse codegen failed", error instanceof Error ? error : new Error(String(error)));
    return c.json(
      {
        success: false,
        error: "Reverse codegen failed",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.COMPILATION_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;
