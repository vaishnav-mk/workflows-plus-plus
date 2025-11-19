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

export const ConditionalRouterNode = {
  metadata: {
    type: "conditional-router",
    name: "Conditional (Router)",
    description: "Route execution to different paths based on condition",
    category: "control" as const,
    version: "1.0.0",
    icon: "GitBranch",
    color: "#8B5CF6",
    tags: ["if", "condition", "routing", "branch"]
  },
  configSchema: ConditionalConfigSchema,
  inputPorts: [
    { id: "trigger", label: "Execute", type: "any" as const, description: "Input data", required: true }
  ],
  outputPorts: [
    { id: "true", label: "True", type: "any" as const, description: "Condition is true", required: false },
    { id: "false", label: "False", type: "any" as const, description: "Condition is false", required: false }
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
      name: "Route by Status",
      description: "Route to different paths based on status code",
      config: { condition: { type: "simple", left: "status", operator: "===", right: 200 } }
    }
  ]
};

