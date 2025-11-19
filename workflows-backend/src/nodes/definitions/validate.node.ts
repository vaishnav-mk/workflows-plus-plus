import { z } from "zod";

const ValidationRuleSchema = z.object({
  field: z.string(),
  type: z.enum(["required", "email", "url", "length", "range", "regex", "custom"]),
  config: z.record(z.any()).optional(),
  message: z.string()
});

const ValidateConfigSchema = z.object({
  rules: z.array(ValidationRuleSchema).default([]),
  mode: z.enum(["all", "any"]).default("all"),
  onFailure: z.enum(["error", "warn"]).default("error"),
  errorMessage: z.string().default("Validation failed")
});

export const ValidateNode = {
  metadata: {
    type: "validate",
    name: "Validate",
    description: "Validate data against rules",
    category: "transform" as const,
    version: "1.0.0",
    icon: "CheckSquare",
    color: "#10B981",
    tags: ["validation", "check", "rules"]
  },
  configSchema: ValidateConfigSchema,
  inputPorts: [
    { id: "trigger", label: "Execute", type: "any" as const, description: "Data to validate", required: true }
  ],
  outputPorts: [
    { id: "valid", label: "Valid", type: "boolean" as const, description: "Validation passed", required: false },
    { id: "errors", label: "Errors", type: "array" as const, description: "Validation errors", required: false },
    { id: "data", label: "Data", type: "any" as const, description: "Validated data", required: false }
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: false,
    isAsync: false,
    canFail: true
  },
  validation: {
    rules: [],
    errorMessages: {}
  },
  examples: [
    {
      name: "Email Validation",
      description: "Check if email is valid",
      config: {
        rules: [{ field: "email", type: "email", message: "Invalid email address" }]
      }
    }
  ]
};

