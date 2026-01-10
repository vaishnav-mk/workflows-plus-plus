import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";

const MCPToolInputConfigSchema = z.object({
  toolName: z.string().default("workflow_tool"),
  description: z.string().default("Workflow tool exposed via MCP"),
  parameters: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(["string", "number", "boolean", "object", "array"]),
        required: z.boolean().default(false),
        description: z.string().optional()
      })
    )
    .default([])
});

type MCPToolInputConfig = z.infer<typeof MCPToolInputConfigSchema>;

export const MCPToolInputNode: WorkflowNodeDefinition<MCPToolInputConfig> = {
  metadata: {
    type: NodeType.MCP_TOOL_INPUT,
    name: "MCP Tool Input",
    description: "Define tool parameters exposed via MCP",
    category: NodeCategory.AI,
    version: "1.0.0",
    icon: "Input",
    color: "#8B5CF6",
    tags: ["mcp", "tool", "input"]
  },
  configSchema: MCPToolInputConfigSchema,
  inputPorts: [],
  outputPorts: [
    {
      id: "params",
      label: "Parameters",
      type: DataType.OBJECT,
      description: "Tool parameters",
      required: false
    }
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: false,
    isAsync: false,
    canFail: false
  },
  validation: {
    rules: [],
    errorMessages: {}
  },
  examples: [
    {
      name: "Basic Tool",
      description: "Simple tool with one parameter",
      config: {
        toolName: "get_data",
        description: "Get data from workflow",
        parameters: [
          {
            name: "query",
            type: "string",
            required: true,
            description: "Search query"
          }
        ]
      }
    }
  ],
  presetOutput: {
    params: {}
  },
  codegen: ({
    nodeId,
    config
  }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function*(_) {
      let params: Array<{
        name: string;
        type: string;
        required?: boolean;
        description?: string;
      }> = [];

      if (config.parameters) {
        if (typeof config.parameters === "string") {
          try {
            const parsed = JSON.parse(config.parameters);
            if (Array.isArray(parsed)) {
              params = parsed;
            } else if (typeof parsed === "object") {
              params = Object.entries(parsed).map(([name, type]) => ({
                name,
                type: String(type),
                required: true
              }));
            }
          } catch (e) {
            params = [];
          }
        } else if (Array.isArray(config.parameters)) {
          params = config.parameters;
        }
      }

      const paramNames = params.map(p => p.name).filter(Boolean);

      let code: string;
      if (paramNames.length > 0) {
        const paramList = paramNames.join(", ");
        const paramObject = paramNames
          .map(name => `${name}: ${name}`)
          .join(", ");
        code = `
    const { ${paramList} } = event.params || {};
    _workflowState['${nodeId}'] = {
      input: event.params,
      output: { ${paramObject} }
    };`;
      } else {
        code = `
    _workflowState['${nodeId}'] = {
      input: event.params,
      output: event.params
    };`;
      }

      return {
        code,
        requiredBindings: []
      };
    });
  }
};
