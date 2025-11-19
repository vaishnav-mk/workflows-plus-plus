import { z } from "zod";

const KVPutConfigSchema = z.object({
  namespace: z.string().default("KV"),
  key: z.string().min(1, "Key is required and cannot be empty"),
  value: z.object({
    type: z.enum(["static", "variable", "expression"]),
    content: z.any()
  }, {
    required_error: "Value object is required"
  }).refine(
    (val) => {
      // Content must be provided (not empty) when type is static
      if (val.type === "static") {
        const hasContent = val.content !== undefined && 
                          val.content !== null && 
                          val.content !== "" &&
                          !(typeof val.content === 'object' && Object.keys(val.content).length === 0);
        return hasContent;
      }
      // For variable/expression, content can be empty string (will be evaluated at runtime)
      return true;
    },
    { 
      message: "Content is required and cannot be empty when type is 'static'",
      path: ["content"]
    }
  )
});

export const KVPutNode = {
  metadata: {
    type: "kv-put",
    name: "KV Put",
    description: "Write data to Workers KV storage",
    category: "storage" as const,
    version: "1.0.0",
    icon: "Save",
    color: "#F59E0B",
    tags: ["kv", "storage", "write"]
  },
  configSchema: KVPutConfigSchema,
  inputPorts: [
    { id: "trigger", label: "Execute", type: "any" as const, description: "Trigger write", required: true }
  ],
  outputPorts: [
    { id: "success", label: "Success", type: "boolean" as const, description: "Write successful", required: false },
    { id: "key", label: "Key", type: "string" as const, description: "Key that was written", required: false }
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
      name: "Save User",
      description: "Store user data in KV",
      config: { namespace: "USERS_KV", key: "user-123", value: { type: "static", content: { name: "John" } } }
    }
  ],
  presetOutput: {
    success: true,
    key: "user-123"
  }
};

