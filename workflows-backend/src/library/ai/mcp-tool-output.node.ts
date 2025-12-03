/**
 * MCP Tool Output Node - Format workflow output as MCP tool response
 */

import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenContext, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";
import { TEMPLATE_PATTERNS } from "../../core/constants";

const MCPToolOutputConfigSchema = z.object({
  format: z.enum(["json", "text", "object"]).default("json"),
  responseStructure: z.object({
    type: z.enum(["expression", "variable", "static"]),
    value: z.any(),
  }).optional(),
});

type MCPToolOutputConfig = z.infer<typeof MCPToolOutputConfigSchema>;

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

export const MCPToolOutputNode: WorkflowNodeDefinition<MCPToolOutputConfig> = {
  metadata: {
    type: NodeType.MCP_TOOL_OUTPUT,
    name: "MCP Tool Output",
    description: "Format workflow output as MCP tool response",
    category: NodeCategory.AI,
    version: "1.0.0",
    icon: "Output",
    color: "#8B5CF6",
    tags: ["mcp", "tool", "output"],
  },
  configSchema: MCPToolOutputConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Data to format as MCP response",
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
      name: "JSON Output",
      description: "Return JSON formatted response",
      config: {
        format: "json",
        responseStructure: { type: "expression", value: "data" },
      },
    },
  ],
  codegen: ({ nodeId, config, stepName, graphContext }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const inputData = graphContext.edges
        .filter(e => e.target === nodeId)
        .map(e => `_workflowState['${e.source}']?.output || event.payload`)[0] || "event.payload";

      let value = inputData;
      if (config.responseStructure?.type === "expression") {
        value = config.responseStructure.value;
      } else if (config.responseStructure?.type === "variable") {
        const varValue = config.responseStructure.value;
        if (typeof varValue === "string" && varValue.includes("{{")) {
          value = resolveTemplateExpression(varValue, graphContext);
        } else {
          value = JSON.stringify(varValue);
        }
      } else if (config.responseStructure?.value) {
        const returnVal = config.responseStructure.value;
        if (typeof returnVal === "string" && returnVal.includes("{{")) {
          value = resolveTemplateExpression(returnVal, graphContext);
        } else {
          value = JSON.stringify(returnVal);
        }
      }

      const format = config.format || "json";
      let formattedValue = value;
      if (format === "json") {
        formattedValue = `JSON.stringify(${value})`;
      } else if (format === "text") {
        formattedValue = `String(${value})`;
      }

      const code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      const result = {
        content: [{
          type: "${format}",
          ${format === "json" ? "text" : format}: ${formattedValue}
        }]
      };
      _workflowState['${nodeId}'] = {
        input: inputData,
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



