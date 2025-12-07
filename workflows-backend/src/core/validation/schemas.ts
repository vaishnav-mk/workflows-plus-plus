/**
 * Centralized Zod Validation Schemas
 * All request/response validation schemas for API endpoints
 */

import { z } from "zod";

// Common schemas
export const PaginationQuerySchema = z.object({
  page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
  per_page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 10))
});

export const IdParamSchema = z.object({
  id: z.string().min(1, "ID is required")
});

export const WorkflowNameParamSchema = z.object({
  workflowName: z.string().min(1, "Workflow name is required")
});

export const InstanceParamsSchema = z.object({
  workflowName: z.string().min(1, "Workflow name is required"),
  instanceId: z.string().min(1, "Instance ID is required")
});

export const WorkerIdParamSchema = z.object({
  id: z.string().min(1, "Worker ID is required")
});

export const WorkerVersionParamsSchema = z.object({
  workerId: z.string().min(1, "Worker ID is required"),
  versionId: z.string().min(1, "Version ID is required")
});

export const NodeTypeParamSchema = z.object({
  nodeType: z.string().min(1, "Node type is required")
});

export const CategoryQuerySchema = z.object({
  category: z.string().min(1, "Category is required")
});

export const DatabaseIdParamSchema = z.object({
  id: z.string().min(1, "Database ID is required")
});

// Setup routes
export const SetupRequestSchema = z.object({
  apiToken: z.string().min(1, "API token is required"),
  accountId: z.string().min(1, "Account ID is required")
});

// Workflow schemas
export const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: z
    .object({
      x: z.number(),
      y: z.number()
    })
    .optional(),
  data: z.record(z.any()).optional(),
  config: z.record(z.any()).optional()
});

export const WorkflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional()
});

export const WorkflowCreateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  nodes: z.array(WorkflowNodeSchema).default([]),
  edges: z.array(WorkflowEdgeSchema).default([])
});

export const WorkflowUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  nodes: z.array(WorkflowNodeSchema).optional(),
  edges: z.array(WorkflowEdgeSchema).optional(),
  version: z.number().int().positive().optional(),
  status: z.enum(["draft", "published", "archived"]).optional()
});

export const WorkflowValidateSchema = z.object({
  nodes: z.array(WorkflowNodeSchema).default([]),
  edges: z.array(WorkflowEdgeSchema).default([])
});

export const WorkflowDeploySchema = z.object({
  workflowName: z.string().min(1).max(100).optional(),
  scriptName: z.string().min(1).max(100).optional(),
  className: z.string().min(1).max(100).optional(),
  subdomain: z.string().optional(),
  mcpEnabled: z.boolean().optional(),
  nodes: z.array(WorkflowNodeSchema).optional(),
  edges: z.array(WorkflowEdgeSchema).optional(),
  bindings: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        id: z.string().optional(),
        databaseName: z.string().optional(),
        bucketName: z.string().optional()
      })
    )
    .optional(),
  assets: z.record(z.any()).optional()
});

// Compiler schemas
export const CompileRequestSchema = z.object({
  name: z.string().min(1).optional(),
  nodes: z.array(WorkflowNodeSchema).default([]),
  edges: z.array(WorkflowEdgeSchema).default([]),
  options: z
    .object({
      desiredWorkflowName: z.string().optional(),
      includeBindings: z.boolean().optional(),
      workflowId: z.string().optional()
    })
    .optional()
});

export const ResolveWorkflowSchema = z.object({
  nodes: z.array(WorkflowNodeSchema).default([]),
  edges: z.array(WorkflowEdgeSchema).default([])
});

export const ResolveNodeSchema = z.object({
  workflow: z.object({
    nodes: z.array(WorkflowNodeSchema).default([]),
    edges: z.array(WorkflowEdgeSchema).default([])
  }),
  nodeId: z.string().min(1, "Node ID is required")
});

export const ValidateBindingsSchema = z.object({
  workflow: CompileRequestSchema,
  availableBindings: z
    .array(
      z.object({
        name: z.string(),
        type: z.string()
      })
    )
    .default([])
});

export const ValidateTemplatesSchema = z.object({
  nodes: z.array(WorkflowNodeSchema).default([]),
  edges: z.array(WorkflowEdgeSchema).default([])
});

// Node execution schemas
export const ExecuteNodeSchema = z.object({
  type: z.string().min(1, "Node type is required"),
  config: z.record(z.any()).default({}),
  inputData: z.record(z.any()).default({})
});

export const ValidateNodeSchema = z.object({
  type: z.string().min(1, "Node type is required"),
  config: z.record(z.any()).default({})
});

// AI Workflow schemas
export const GenerateWorkflowSchema = z
  .object({
    text: z.string().optional(),
    image: z.string().optional(),
    imageMimeType: z.string().optional()
  })
  .refine(data => data.text || data.image, {
    message: "Either text or image is required"
  });

// Reverse codegen schema
export const ReverseCodegenSchema = z.object({
  code: z.string().min(1, "Workflow code is required")
});

// Instance schemas (no body schemas needed, just params)
