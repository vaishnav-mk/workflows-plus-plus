/**
 * Transform Node - Execute JavaScript to transform data
 */

import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenContext, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";
import { TEMPLATE_PATTERNS } from "../../core/constants";

const TransformConfigSchema = z.object({
  code: z.string().default("return data;"),
});

type TransformConfig = z.infer<typeof TransformConfigSchema>;

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
      return `_workflowResults.${stepName}${tail}`;
    }
    const tail = rest.length ? "." + rest.join(".") : ".output";
    return `_workflowState['${nodeRef}']${tail}`;
  });
}

export const TransformNode: WorkflowNodeDefinition<TransformConfig> = {
  metadata: {
    type: NodeType.TRANSFORM,
    name: "Transform",
    description: "Execute JavaScript to transform data",
    category: NodeCategory.TRANSFORM,
    version: "1.0.0",
    icon: "Code",
    color: "#8B5CF6",
    tags: ["javascript", "data", "transform"],
  },
  configSchema: TransformConfigSchema,
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
      id: "result",
      label: "Result",
      type: DataType.ANY,
      description: "Transformed data",
      required: false,
    },
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: false,
    isAsync: false,
    canFail: true,
  },
  validation: {
    rules: [],
    errorMessages: {},
  },
  examples: [
    {
      name: "Double Value",
      description: "Multiply input by 2",
      config: { code: "return { value: data.value * 2 };" },
    },
    {
      name: "Format User",
      description: "Format user data",
      config: { code: "return { fullName: data.firstName + \" \" + data.lastName };" },
    },
  ],
  presetOutput: {
    result: { transformed: true, data: {} },
    message: "Data transformation completed successfully",
  },
  codegen: ({ nodeId, config, stepName, graphContext }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      let code = config.code || "return inputData;";
      code = code.replace(/\binput\b/g, "inputData");
      code = code.replace(/\bdata\b/g, "inputData");
      
      if (code.includes("{{")) {
        code = resolveTemplateExpression(code, graphContext);
      }
      
      if (code.startsWith("return ")) {
        code = code.substring(7);
      }

      code = code.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
      
      let validCode = code;
      if (!code.includes("return") && !code.includes("{") && !code.includes(";")) {
        validCode = `(${code})`;
      } else if (!code.includes("return") && code.includes("{")) {
        validCode = `(() => { ${code} })()`;
      } else if (code.includes("const") && code.includes("return")) {
        validCode = `(() => { ${code} })()`;
      } else if (code.includes(";")) {
        validCode = `(() => { ${code} })()`;
      }

      const inputData = graphContext.edges
        .filter(e => e.target === nodeId)
        .map(e => `_workflowState['${e.source}']?.output || event.payload`)[0] || "event.payload";

      const codeGen = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      const result = ${validCode};
      const output = { ...result, message: 'Data transformation completed successfully' };
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: output
      };
      return output;
    });`;

      return {
        code: codeGen,
        requiredBindings: [],
      };
    });
  },
};



