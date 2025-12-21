import { Hono } from "hono";
import { WorkflowCompiler } from "../../services/compiler/workflow-compiler";
import { resolveWorkflow, resolveTemplate } from "../../services/compiler/template-resolver";
import { GraphAnalyzer } from "../../services/compiler/graph-analyzer";
import { runPromise } from "../../core/effect/runtime";
import { HTTP_STATUS_CODES, MESSAGES } from "../../core/constants";
import { ApiResponse } from "../../types/api";
import { logger } from "../../core/logging/logger";
import { z } from "zod";
import {
  CompileRequestSchema,
  ResolveWorkflowSchema,
  ResolveNodeSchema,
  ValidateBindingsSchema,
  ValidateTemplatesSchema,
  ReverseCodegenSchema
} from "../../core/validation/schemas";
import { parseWorkflowCode } from "../../services/compiler/reverse-codegen";
import { safe } from "../../core/utils/route-helpers";
import { zValidator } from "../../api/middleware/validation.middleware";
import { rateLimitMiddleware } from "../../api/middleware/rate-limit.middleware";
import type { WorkflowEdge } from "../../core/types";

const app = new Hono();

function normalizeEdges(edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>): WorkflowEdge[] {
  return edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined
  }));
}

app.post("/compile", rateLimitMiddleware(), zValidator('json', CompileRequestSchema), safe(async (c) => {
  const { name, nodes, edges, options = {} } = c.req.valid('json') as z.infer<typeof CompileRequestSchema>;

  const result = await runPromise(
    WorkflowCompiler.compile({
      name: name || "Untitled Workflow",
      nodes,
      edges: normalizeEdges(edges || [])
    }, options)
  );

  return c.json({
    success: true,
    data: result,
    message: "Compilation successful"
  }, HTTP_STATUS_CODES.OK);
}));

app.post("/preview", rateLimitMiddleware(), zValidator('json', CompileRequestSchema), safe(async (c) => {
  const { name, nodes, edges, options = {} } = c.req.valid('json') as z.infer<typeof CompileRequestSchema>;

  const result = await runPromise(
    WorkflowCompiler.compile({
      name: name || "Untitled Workflow",
      nodes,
      edges: normalizeEdges(edges || [])
    }, options)
  );

  return c.json({
    success: true,
    data: result,
    message: MESSAGES.COMPILATION_PREVIEWED
  }, HTTP_STATUS_CODES.OK);
}));

app.post("/validate-bindings", rateLimitMiddleware(), zValidator('json', ValidateBindingsSchema), safe(async (c) => {
  const { workflow, availableBindings } = c.req.valid('json') as z.infer<typeof ValidateBindingsSchema>;

  const compilationResult = await runPromise(
    WorkflowCompiler.compile({
      name: workflow.name || "Untitled Workflow",
      nodes: workflow.nodes,
      edges: normalizeEdges(workflow.edges)
    }, {})
  );

  const required = compilationResult.bindings || [];
  const available = availableBindings || [];

  const missing = required.filter(req =>
    !available.some(avail => avail.name === req.name && avail.type === req.type)
  );

  return c.json({
    success: true,
    data: { required, available, missing, valid: missing.length === 0 },
    message: MESSAGES.BINDINGS_VALIDATED
  }, HTTP_STATUS_CODES.OK);
}));

app.post("/validate-templates", rateLimitMiddleware(), zValidator('json', ValidateTemplatesSchema), safe(async (c) => {
  logger.info("Validating templates");
  
  const workflow = c.req.valid('json') as z.infer<typeof ValidateTemplatesSchema>;

  const graphContext = await runPromise(
    GraphAnalyzer.buildGraphContext(workflow.nodes, normalizeEdges(workflow.edges))
  );

  const result = await runPromise(
    resolveWorkflow(workflow, graphContext)
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
}));

app.post("/resolve-workflow", rateLimitMiddleware(), zValidator('json', ResolveWorkflowSchema), safe(async (c) => {
  const { nodes, edges } = c.req.valid('json') as z.infer<typeof ResolveWorkflowSchema>;
  const graphContext = await runPromise(GraphAnalyzer.buildGraphContext(nodes, normalizeEdges(edges)));
  const result = await runPromise(resolveWorkflow(c.req.valid('json') as z.infer<typeof ResolveWorkflowSchema>, graphContext));

  return c.json({
    success: true,
    data: result,
    message: "Templates resolved successfully"
  }, HTTP_STATUS_CODES.OK);
}));

const NodeIdParamSchema = z.object({ nodeId: z.string().min(1, "Node ID is required") });

app.post("/resolve-node/:nodeId", rateLimitMiddleware(), zValidator('param', NodeIdParamSchema), zValidator('json', ResolveNodeSchema), safe(async (c) => {
  const { nodeId } = c.req.valid('param') as z.infer<typeof NodeIdParamSchema>;
  const { workflow } = c.req.valid('json') as z.infer<typeof ResolveNodeSchema>;
  
  const graphContext = await runPromise(
    GraphAnalyzer.buildGraphContext(workflow.nodes, normalizeEdges(workflow.edges))
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
        resolveTemplate(value, graphContext, nodeId)
      );
      resolvedConfig[key] = result.resolved;
    } else {
      resolvedConfig[key] = value;
    }
  }

  return c.json({
    success: true,
    data: { nodeId, resolvedConfig },
    message: "Node templates resolved successfully"
  }, HTTP_STATUS_CODES.OK);
}));

app.post("/reverse-codegen", rateLimitMiddleware(), zValidator('json', ReverseCodegenSchema), safe(async (c) => {
  const { code } = c.req.valid('json') as z.infer<typeof ReverseCodegenSchema>;
  const result = await runPromise(parseWorkflowCode(code));

  return c.json({
    success: true,
    data: result,
    message: "Workflow code parsed successfully"
  }, HTTP_STATUS_CODES.OK);
}));

export default app;
