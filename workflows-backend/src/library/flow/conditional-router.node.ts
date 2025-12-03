/**
 * Conditional Router Node - Route execution based on condition
 */

import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";

const ConditionalConfigSchema = z.object({
  condition: z.object({
    type: z.enum(["simple", "expression"]),
    left: z.string().optional(),
    operator: z.enum(["===", "!==", ">", "<", ">=", "<="]).optional(),
    right: z.any().optional(),
    expression: z.string().optional(),
  }),
});

type ConditionalConfig = z.infer<typeof ConditionalConfigSchema>;

function generateConditionExpression(condition: ConditionalConfig["condition"]): string {
  if (condition.type === "simple") {
    let left = condition.left || "";
    if (left.includes(".")) {
      left = `event.payload.${left}`;
    } else if (!left.startsWith("event.") && !left.startsWith("data.")) {
      left = `event.payload.${left}`;
    }
    return `${left} ${condition.operator} ${JSON.stringify(condition.right)}`;
  } else {
    return condition.expression || "true";
  }
}

export const ConditionalRouterNode: WorkflowNodeDefinition<ConditionalConfig> = {
  metadata: {
    type: NodeType.CONDITIONAL_ROUTER,
    name: "Conditional (Router)",
    description: "Route execution to different paths based on condition",
    category: NodeCategory.CONTROL,
    version: "1.0.0",
    icon: "GitBranch",
    color: "#8B5CF6",
    tags: ["if", "condition", "routing", "branch"],
  },
  configSchema: ConditionalConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Input data",
      required: true,
    },
  ],
  outputPorts: [
    {
      id: "true",
      label: "True",
      type: DataType.ANY,
      description: "Condition is true",
      required: false,
    },
    {
      id: "false",
      label: "False",
      type: DataType.ANY,
      description: "Condition is false",
      required: false,
    },
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: true,
    isAsync: false,
    canFail: false,
  },
  validation: {
    rules: [],
    errorMessages: {},
  },
  examples: [
    {
      name: "Route by Status",
      description: "Route to different paths based on status code",
      config: { condition: { type: "simple", left: "status", operator: "===", right: 200 } },
    },
  ],
  codegen: ({ config, stepName }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const conditionExpr = generateConditionExpression(config.condition);
      const operator = config.condition.operator || "===";
      const left = config.condition.left || "";
      const right = config.condition.right;

      const code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const condition = ${conditionExpr};
      if (condition) {
        return { branch: 'true', result: true, condition: '${left} ${operator} ${JSON.stringify(right)}' };
      } else {
        return { branch: 'false', result: false, condition: '${left} ${operator} ${JSON.stringify(right)}' };
      }
    });`;

      return {
        code,
        requiredBindings: [],
      };
    });
  },
};



