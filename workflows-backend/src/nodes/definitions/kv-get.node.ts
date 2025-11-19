import { z } from "zod";

const KVGetConfigSchema = z.object({
  namespace: z.string().default("KV"),
  key: z.string(),
  type: z.enum(["json", "text", "arrayBuffer"]).default("json")
});

export const KVGetNode = {
  metadata: {
    type: "kv-get",
    name: "KV Get",
    description: "Read data from Workers KV storage",
    category: "storage" as const,
    version: "1.0.0",
    icon: "Database",
    color: "#F59E0B",
    tags: ["kv", "storage", "read"]
  },
  configSchema: KVGetConfigSchema,
  inputPorts: [
    { id: "trigger", label: "Execute", type: "any" as const, description: "Trigger read", required: true }
  ],
  outputPorts: [
    { id: "value", label: "Value", type: "any" as const, description: "Retrieved value", required: false },
    { id: "metadata", label: "Metadata", type: "object" as const, description: "KV metadata", required: false },
    { id: "exists", label: "Exists", type: "boolean" as const, description: "Whether key exists", required: false }
  ],
  bindings: [
    {
      type: "KV",
      name: "KV",
      required: true,
      description: "Workers KV namespace binding"
    }
  ],
  capabilities: {
    playgroundCompatible: false,
    supportsRetry: true,
    isAsync: true,
    canFail: true
  },
  validation: {
    rules: [],
    errorMessages: {}
  },
  examples: [
    {
      name: "Get User",
      description: "Retrieve user data from KV",
      config: { namespace: "USERS_KV", key: "user-123", type: "json" }
    }
  ],
  presetOutput: {
    value: { id: "user-123", name: "John Doe", email: "john@example.com" },
    exists: true,
    metadata: { key: "user-123" }
  }
};

