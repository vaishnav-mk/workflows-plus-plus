import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenContext, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";
import { TEMPLATE_PATTERNS } from "../../core/constants";

const ReturnConfigSchema = z.object({
  value: z.string().optional(),
  returnValue: z.object({
    type: z.enum(["expression", "variable", "static"]),
    value: z.any(),
  }).optional(),
});

type ReturnConfig = z.infer<typeof ReturnConfigSchema>;

function sanitizeIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

function resolveTemplateExpression(
  expr: string,
  graphContext: CodeGenContext["graphContext"]
): string {
  return expr.replace(TEMPLATE_PATTERNS.TEMPLATE_REGEX, (_match, innerExpr) => {
    const trimmed = innerExpr.trim();
    
    if (trimmed.startsWith(TEMPLATE_PATTERNS.STATE_PREFIX)) {
      const path = trimmed.substring(TEMPLATE_PATTERNS.STATE_PREFIX.length);
      const [nodeId, ...rest] = path.split(TEMPLATE_PATTERNS.PATH_SEPARATOR);
      const tail = rest.length ? "." + rest.join(".") : ".output";
      return `_workflowState['${nodeId}']${tail}`;
    }
    
    const [nodeRef, ...rest] = trimmed.split(TEMPLATE_PATTERNS.PATH_SEPARATOR);
    const stepName = graphContext.stepNameMap.get(nodeRef);
    if (stepName) {
      const tail = rest.length ? "." + rest.join(".") : "";
      const sanitizedStepName = sanitizeIdentifier(stepName);
      return `_workflowResults.${sanitizedStepName}${tail}`;
    }
    
    const tail = rest.length ? "." + rest.join(".") : ".output";
    return `_workflowState['${nodeRef}']${tail}`;
  });
}

export const ReturnNode: WorkflowNodeDefinition<ReturnConfig> = {
  metadata: {
    type: NodeType.RETURN,
    name: "Return",
    description: "Workflow exit point - returns final result",
    category: NodeCategory.CONTROL,
    version: "1.0.0",
    icon: "CheckCircle",
    color: "#EF4444",
    tags: ["end", "finish", "return", "exit"],
  },
  configSchema: ReturnConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Data to return",
      required: true,
    },
  ],
  outputPorts: [],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: false,
    isAsync: false,
    canFail: false,
  },
  validation: {
    rules: [],
    errorMessages: {},
  },
  examples: [
    {
      name: "Return Success",
      description: "Return a success message",
      config: {
        returnValue: { type: "static", value: { success: true, message: "Workflow completed" } },
      },
    },
    {
      name: "Return Input",
      description: "Return the input data",
      config: {
        returnValue: { type: "expression", value: "data" },
      },
    },
  ],
  codegen: ({ nodeId, config, stepName, graphContext }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const inputData = graphContext.edges
        .filter(e => e.target === nodeId)
        .map(e => `_workflowState['${e.source}']?.output || event.payload`)[0] || "event.payload";

      let value: string | null = null;
      
      if (config.value) {
        if (typeof config.value === "string" && config.value.includes("{{")) {
          value = resolveTemplateExpression(config.value, graphContext);
        } else {
          value = JSON.stringify(config.value);
        }
      } else if (config.returnValue?.type === "expression") {
        value = config.returnValue.value;
      } else if (config.returnValue?.type === "variable") {
        const varValue = config.returnValue.value;
        if (typeof varValue === "string" && varValue.includes("{{")) {
          value = resolveTemplateExpression(varValue, graphContext);
        } else {
          value = JSON.stringify(varValue);
        }
      } else if (config.returnValue?.value) {
        const returnVal = config.returnValue.value;
        if (typeof returnVal === "string" && returnVal.includes("{{")) {
          value = resolveTemplateExpression(returnVal, graphContext);
        } else {
          value = JSON.stringify(returnVal);
        }
      }

      const resultValue = value !== null ? value : inputData;

      const sanitizedStepName = sanitizeIdentifier(stepName);

      const code = `
    _workflowResults.${sanitizedStepName} = await step.do('${stepName}', async () => {
      const result = ${resultValue};
      _workflowState['${nodeId}'] = {
        input: ${inputData},
        output: result
      };
      return result;
    });`;

      return {
        code,
        requiredBindings: [],
      };
    });
  },
};
