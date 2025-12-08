import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";

const CaseSchema = z.object({
  case: z.string().min(1, "Case name is required"),
  value: z.any().optional(),
  isDefault: z.boolean().optional().default(false)
});

const ConditionalConfigSchema = z.object({
  conditionPath: z.string().min(1, "Condition path is required"),
  cases: z.array(CaseSchema).min(1, "At least one case is required")
});

type ConditionalConfig = z.infer<typeof ConditionalConfigSchema>;

function resolveConditionPath(path: string): string {
  if (path.startsWith("step_")) {
    const parts = path.split(".");
    const nodeId = parts[0];
    const tail = parts.slice(1).join(".");
    return `_workflowState['${nodeId}']${tail ? "." + tail : ".output"}`;
  }

  if (path.includes(".")) {
    if (path.startsWith("event.") || path.startsWith("data.")) {
      return path;
    }
    return `event.payload.${path}`;
  }

  return `event.payload.${path}`;
}

export const ConditionalRouterNode: WorkflowNodeDefinition<
  ConditionalConfig
> = {
  metadata: {
    type: NodeType.CONDITIONAL_ROUTER,
    name: "Conditional (Router)",
    description: "Route execution to different paths based on condition",
    category: NodeCategory.CONTROL,
    version: "1.0.0",
    icon: "GitBranch",
    color: "#8B5CF6",
    tags: ["if", "condition", "routing", "branch"]
  },
  configSchema: ConditionalConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Input data",
      required: true
    }
  ],
  outputPorts: [
    {
      id: "case1",
      label: "Case 1",
      type: DataType.ANY,
      description: "First case route",
      required: false
    },
    {
      id: "case2",
      label: "Case 2",
      type: DataType.ANY,
      description: "Second case route",
      required: false
    },
    {
      id: "default",
      label: "Default",
      type: DataType.ANY,
      description: "Default case route",
      required: false
    }
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
      name: "Route by Status Code",
      description: "Route to different paths based on HTTP status code",
      config: {
        conditionPath: "status",
        cases: [
          { case: "success", value: 200 },
          { case: "notFound", value: 404 },
          { case: "error", value: 500 },
          { case: "default", isDefault: true }
        ]
      }
    },
    {
      name: "Route by User Type",
      description: "Route based on user type from previous step",
      config: {
        conditionPath: "step_transform_0.output.userType",
        cases: [
          { case: "admin", value: "admin" },
          { case: "user", value: "user" },
          { case: "guest", value: "guest" },
          { case: "default", isDefault: true }
        ]
      }
    }
  ],
  codegen: ({
    config,
    stepName
  }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function*(_) {
      const conditionPath = resolveConditionPath(config.conditionPath);

      const routingCases: Array<{ name: string; value: string }> = [];
      let defaultCase: string | undefined;

      config.cases.forEach(caseConfig => {
        const caseName = caseConfig.case;
        if (caseConfig.isDefault) {
          defaultCase = caseName;
        } else {
          const caseValue = JSON.stringify(caseConfig.value);
          routingCases.push({ name: caseName, value: caseValue });
        }
      });

      const routingEntries: string[] = [];

      routingCases.forEach(({ name, value }) => {
        routingEntries.push(`'${name}': (${conditionPath} === ${value})`);
      });

      if (defaultCase) {
        const otherCaseChecks = routingCases
          .map(c => `routing['${c.name}']`)
          .join(" || ");
        const defaultCheck =
          routingCases.length > 0 ? `!(${otherCaseChecks})` : "true";
        routingEntries.push(`'${defaultCase}': ${defaultCheck}`);
      }

      const code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const conditionValue = ${conditionPath};
      
      const routing = {
        ${routingEntries.join(",\n        ")}
      };
      
      return routing;
    });`;

      return {
        code,
        requiredBindings: []
      };
    });
  }
};
