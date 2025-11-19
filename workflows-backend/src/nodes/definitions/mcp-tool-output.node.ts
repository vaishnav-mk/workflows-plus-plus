import { z } from "zod";

const MCPToolOutputConfigSchema = z.object({
  format: z.enum(["json", "text", "object"]).default("json"),
  responseStructure: z.object({
    type: z.enum(["expression", "variable", "static"]),
    value: z.any(),
  }).optional(),
});

export const MCPToolOutputNode = {
  metadata: {
    type: "mcp-tool-output",
    name: "MCP Tool Output",
    description: "Format workflow output as MCP tool response",
    category: "mcp" as const,
    version: "1.0.0",
    icon: "Output",
    color: "#8B5CF6",
    tags: ["mcp", "tool", "output"],
  },
  configSchema: MCPToolOutputConfigSchema,
  inputPorts: [
    { id: "trigger", label: "Execute", type: "any" as const, description: "Data to format as MCP response", required: true },
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
    errorMessages: {}
  },
  examples: [
    {
      name: "JSON Output",
      description: "Return JSON formatted response",
      config: {
        format: "json",
        responseStructure: { type: "expression", value: "data" }
      }
    }
  ],
};



