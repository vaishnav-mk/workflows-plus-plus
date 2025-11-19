import { z } from "zod";

export const PortSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["string", "number", "boolean", "object", "array", "any"]),
  description: z.string(),
  required: z.boolean().default(false),
  defaultValue: z.any().optional()
});

export const BindingSchema = z.object({
  type: z.enum(["KV", "D1", "R2", "AI", "DURABLE_OBJECT", "SERVICE"]),
  name: z.string(),
  required: z.boolean().default(true),
  description: z.string()
});

export const NodeDefinitionSchema = z.object({
  metadata: z.object({
    type: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.enum([
      "control",
      "http",
      "storage",
      "database",
      "transform",
      "timing",
      "ai",
      "messaging"
    ]),
    version: z.string(),
    icon: z.string(),
    color: z.string(),
    tags: z.array(z.string()).default([])
  }),
  configSchema: z.any(), // Zod schema for config
  inputPorts: z.array(PortSchema),
  outputPorts: z.array(PortSchema),
  bindings: z.array(BindingSchema).default([]),
  capabilities: z.object({
    playgroundCompatible: z.boolean(),
    supportsRetry: z.boolean().default(true),
    isAsync: z.boolean().default(true),
    canFail: z.boolean().default(true)
  }),
  validation: z.object({
    rules: z.array(z.any()).default([]), // JSONLogic rules
    errorMessages: z.record(z.string()).default({})
  }),
  examples: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      config: z.any(),
      expectedOutput: z.any().optional()
    })
  ),
  presetOutput: z.any().optional() // Example output structure for state visualization
});

export type PortDefinition = z.infer<typeof PortSchema>;
export type BindingDefinition = z.infer<typeof BindingSchema>;
export type NodeDefinition = z.infer<typeof NodeDefinitionSchema>;
