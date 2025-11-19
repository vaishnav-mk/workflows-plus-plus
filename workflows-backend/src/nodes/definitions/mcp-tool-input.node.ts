import { z } from "zod";

const MCPToolInputConfigSchema = z.object({
  toolName: z.string().default("workflow_tool"),
  description: z.string().default("Workflow tool exposed via MCP"),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.enum(["string", "number", "boolean", "object", "array"]),
    required: z.boolean().default(false),
    description: z.string().optional(),
  })).default([]),
});

export const MCPToolInputNode = {
  metadata: {
    type: "mcp-tool-input",
    name: "MCP Tool Input",
    description: "Define tool parameters exposed via MCP",
    category: "mcp" as const,
    version: "1.0.0",
    icon: "Input",
    color: "#8B5CF6",
    tags: ["mcp", "tool", "input"],
  },
  configSchema: MCPToolInputConfigSchema,
  inputPorts: [],
  outputPorts: [
    { id: "params", label: "Parameters", type: "object" as const, description: "Tool parameters", required: false },
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: false,
    isAsync: false,
    canFail: false,
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
        parameters: [{ name: "query", type: "string", required: true, description: "Search query" }]
      }
    }
  ],
  presetOutput: {
    params: {}
  }
};





