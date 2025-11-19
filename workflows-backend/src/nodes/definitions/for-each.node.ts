import { z } from "zod";

const ForEachConfigSchema = z.object({
  array: z.string().default("items"),
  itemName: z.string().default("item"),
  indexName: z.string().default("index"),
  maxIterations: z.number().default(1000),
  parallel: z.boolean().default(false),
  continueOnError: z.boolean().default(true)
});

export const ForEachNode = {
  metadata: {
    type: "for-each",
    name: "For Each",
    description: "Iterate over array items",
    category: "control" as const,
    version: "1.0.0",
    icon: "Repeat",
    color: "#EC4899",
    tags: ["loop", "iteration", "array"]
  },
  configSchema: ForEachConfigSchema,
  inputPorts: [
    { id: "trigger", label: "Execute", type: "any" as const, description: "Array to iterate", required: true }
  ],
  outputPorts: [
    { id: "items", label: "Items", type: "array" as const, description: "All items processed", required: false },
    { id: "results", label: "Results", type: "array" as const, description: "Results from iterations", required: false },
    { id: "count", label: "Count", type: "number" as const, description: "Number processed", required: false }
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: false,
    isAsync: true,
    canFail: true
  },
  validation: {
    rules: [],
    errorMessages: {}
  },
  examples: [
    {
      name: "Process Array",
      description: "Loop through items",
      config: { array: "users", itemName: "user", maxIterations: 100 }
    }
  ]
};

