import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";

const ForEachConfigSchema = z.object({
  array: z.string().default("items"),
  itemName: z.string().default("item"),
  indexName: z.string().default("index"),
  maxIterations: z.number().default(1000),
  parallel: z.boolean().default(false),
  continueOnError: z.boolean().default(true),
});

type ForEachConfig = z.infer<typeof ForEachConfigSchema>;

export const ForEachNode: WorkflowNodeDefinition<ForEachConfig> = {
  metadata: {
    type: NodeType.FOR_EACH,
    name: "For Each",
    description: "Iterate over array items",
    category: NodeCategory.CONTROL,
    version: "1.0.0",
    icon: "Repeat",
    color: "#EC4899",
    tags: ["loop", "iteration", "array"],
  },
  configSchema: ForEachConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Array to iterate",
      required: true,
    },
  ],
  outputPorts: [
    {
      id: "items",
      label: "Items",
      type: DataType.ARRAY,
      description: "All items processed",
      required: false,
    },
    {
      id: "results",
      label: "Results",
      type: DataType.ARRAY,
      description: "Results from iterations",
      required: false,
    },
    {
      id: "count",
      label: "Count",
      type: DataType.NUMBER,
      description: "Number processed",
      required: false,
    },
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: false,
    isAsync: true,
    canFail: true,
  },
  validation: {
    rules: [],
    errorMessages: {},
  },
  examples: [
    {
      name: "Process Array",
      description: "Loop through items",
      config: { array: "users", itemName: "user", maxIterations: 100 },
    },
  ],
  codegen: ({ config, stepName }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const arrayPath = config.array || "items";
      const itemName = config.itemName || "item";
      const indexName = config.indexName || "index";
      const maxIter = config.maxIterations || 1000;

      const code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputArray = event.payload.${arrayPath} || event.payload || [];
      if (!Array.isArray(inputArray)) {
        throw new Error('Input must be an array');
      }
      const items = inputArray.slice(0, ${maxIter});
      const results = [];
      for (let ${indexName} = 0; ${indexName} < items.length; ${indexName}++) {
        const ${itemName} = items[${indexName}];
        try {
          results.push(${itemName});
        } catch (error) {
          if (!${config.continueOnError}) {
            throw error;
          }
        }
      }
      return { items, results, count: results.length };
    });`;

      return {
        code,
        requiredBindings: [],
      };
    });
  },
};
