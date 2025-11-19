import { z } from "zod";

const ConditionalConfigSchema = z.object({
  condition: z.object({
    type: z.enum(["simple", "expression"]),
    left: z.string().optional(),
    operator: z.enum(["===", "!==", ">", "<", ">=", "<="]).optional(),
    right: z.any().optional(),
    expression: z.string().optional()
  })
});

export const ConditionalInlineNode = {
  metadata: {
    type: "conditional-inline",
    name: "Conditional (Inline)",
    description: "Evaluate condition and return true/false branch data",
    category: "control" as const,
    version: "1.0.0",
    icon: "GitBranch",
    color: "#8B5CF6",
    tags: ["if", "condition", "branch"]
  },
  configSchema: ConditionalConfigSchema,
  inputPorts: [
    { id: "trigger", label: "Execute", type: "any" as const, description: "Input data", required: true }
  ],
  outputPorts: [
    { id: "result", label: "Result", type: "object" as const, description: "Contains branch and condition result", required: false }
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: true,
    isAsync: false,
    canFail: false
  },
  validation: {
    rules: [],
    errorMessages: {}
  },
  examples: [
    {
      name: "Check Value",
      description: "Check if value > 10",
      config: { condition: { type: "simple", left: "value", operator: ">", right: 10 } }
    },
    {
      name: "Complex Expression",
      description: "Evaluate complex expression",
      config: { condition: { type: "expression", expression: 'data.age > 18 && data.status === "active"' } }
    }
  ]
};
