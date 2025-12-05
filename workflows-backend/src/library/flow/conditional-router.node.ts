/**
 * Conditional Router Node - Route execution based on condition
 */

import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";

const CaseSchema = z.object({
  case: z.string().min(1, "Case name is required"),
  value: z.any().optional(), // Value to match against
  isDefault: z.boolean().optional().default(false), // If true, this is the default case
});

const ConditionalConfigSchema = z.object({
  conditionPath: z.string().min(1, "Condition path is required"), // Path to condition value in input (e.g., "status", "event.payload.status", "step_http_1.output.code")
  cases: z.array(CaseSchema).min(1, "At least one case is required"),
});

type ConditionalConfig = z.infer<typeof ConditionalConfigSchema>;

function resolveConditionPath(path: string): string {
  // If path starts with step_ or contains step reference, resolve it to _workflowState
  if (path.startsWith("step_")) {
    const parts = path.split(".");
    const nodeId = parts[0];
    const tail = parts.slice(1).join(".");
    // Use nodeId directly as key in _workflowState (nodeId is the step identifier)
    return `_workflowState['${nodeId}']${tail ? "." + tail : ".output"}`;
  }
  
  // If path includes dots, assume it's a nested path
  if (path.includes(".")) {
    if (path.startsWith("event.") || path.startsWith("data.")) {
      return path;
    }
    // Assume it's a path in event.payload
    return `event.payload.${path}`;
  }
  
  // Simple path - assume it's in event.payload
  return `event.payload.${path}`;
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
  // Output ports are dynamic based on cases, but we provide a default set
  // The actual ports will be determined by the cases in config
  outputPorts: [
    {
      id: "case1",
      label: "Case 1",
      type: DataType.ANY,
      description: "First case route",
      required: false,
    },
    {
      id: "case2",
      label: "Case 2",
      type: DataType.ANY,
      description: "Second case route",
      required: false,
    },
    {
      id: "default",
      label: "Default",
      type: DataType.ANY,
      description: "Default case route",
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
      name: "Route by Status Code",
      description: "Route to different paths based on HTTP status code",
      config: {
        conditionPath: "status",
        cases: [
          { case: "success", value: 200 },
          { case: "notFound", value: 404 },
          { case: "error", value: 500 },
          { case: "default", isDefault: true },
        ],
      },
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
          { case: "default", isDefault: true },
        ],
      },
    },
  ],
  codegen: ({ config, stepName }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      // Resolve condition path from input
      const conditionPath = resolveConditionPath(config.conditionPath);
      
      // Build routing object with cases
      const routingCases: Array<{ name: string; value: string }> = [];
      let defaultCase: string | undefined;
      
      config.cases.forEach((caseConfig) => {
        const caseName = caseConfig.case;
        if (caseConfig.isDefault) {
          defaultCase = caseName;
        } else {
          // Compare condition value with case value
          const caseValue = JSON.stringify(caseConfig.value);
          routingCases.push({ name: caseName, value: caseValue });
        }
      });
      
      // Build routing object entries
      const routingEntries: string[] = [];
      
      // Add specific cases
      routingCases.forEach(({ name, value }) => {
        routingEntries.push(`'${name}': (${conditionPath} === ${value})`);
      });
      
      // Add default case (true if none of the other cases match)
      if (defaultCase) {
        const otherCaseChecks = routingCases.map(c => `routing['${c.name}']`).join(' || ');
        const defaultCheck = routingCases.length > 0 
          ? `!(${otherCaseChecks})`
          : 'true';
        routingEntries.push(`'${defaultCase}': ${defaultCheck}`);
      }
      
      const code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      // Get condition value from input
      const conditionValue = ${conditionPath};
      
      // Build routing object: {case1: boolean, case2: boolean, default: boolean}
      // Only one key will be true, indicating which route to take
      const routing = {
        ${routingEntries.join(",\n        ")}
      };
      
      return routing;
    });`;

      return {
        code,
        requiredBindings: [],
      };
    });
  },
};



