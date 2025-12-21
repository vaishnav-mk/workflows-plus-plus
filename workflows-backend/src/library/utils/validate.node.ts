import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";

const ValidationRuleSchema = z.object({
  field: z.string(),
  type: z.enum(["required", "email", "url", "length", "range", "regex", "custom"]),
  config: z.record(z.any()).optional(),
  message: z.string(),
});

const ValidateConfigSchema = z.object({
  rules: z.array(ValidationRuleSchema).default([]),
  mode: z.enum(["all", "any"]).default("all"),
  onFailure: z.enum(["error", "warn"]).default("error"),
  errorMessage: z.string().default("Validation failed"),
});

type ValidateConfig = z.infer<typeof ValidateConfigSchema>;

function generateValidationRule(rule: ValidateConfig["rules"][0]): string {
  const field = rule.field;
  const message = rule.message;

  switch (rule.type) {
    case "required":
      return `if (!data.${field}) errors.push({ field: '${field}', message: '${message}' });`;
    case "email":
      return `if (data.${field} && !data.${field}.includes('@')) errors.push({ field: '${field}', message: '${message}' });`;
    case "url":
      return `if (data.${field} && !data.${field}.startsWith('http')) errors.push({ field: '${field}', message: '${message}' });`;
    case "length":
      return `if (data.${field} && (data.${field}.length < ${rule.config?.min || 0} || data.${field}.length > ${rule.config?.max || 1000})) errors.push({ field: '${field}', message: '${message}' });`;
    case "range":
      return `if (data.${field} && (data.${field} < ${rule.config?.min || 0} || data.${field} > ${rule.config?.max || 1000})) errors.push({ field: '${field}', message: '${message}' });`;
    case "regex":
      return `if (data.${field} && !/${rule.config?.pattern || ".*"}/.test(data.${field})) errors.push({ field: '${field}', message: '${message}' });`;
    case "custom":
      return rule.config?.customCode || "";
    default:
      return `// Unknown validation rule: ${rule.type}`;
  }
}

export const ValidateNode: WorkflowNodeDefinition<ValidateConfig> = {
  metadata: {
    type: NodeType.VALIDATE,
    name: "Validate",
    description: "Validate data against rules",
    category: NodeCategory.TRANSFORM,
    version: "1.0.0",
    icon: "CheckSquare",
    color: "#10B981",
    tags: ["validation", "check", "rules"],
  },
  configSchema: ValidateConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Data to validate",
      required: true,
    },
  ],
  outputPorts: [
    {
      id: "valid",
      label: "Valid",
      type: DataType.BOOLEAN,
      description: "Validation passed",
      required: false,
    },
    {
      id: "errors",
      label: "Errors",
      type: DataType.ARRAY,
      description: "Validation errors",
      required: false,
    },
    {
      id: "data",
      label: "Data",
      type: DataType.ANY,
      description: "Validated data",
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
      name: "Email Validation",
      description: "Check if email is valid",
      config: {
        rules: [{ field: "email", type: "email", message: "Invalid email address" }],
      },
    },
  ],
  codegen: ({ config, stepName }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const rulesCode = config.rules
        ?.map(rule => generateValidationRule(rule))
        .join("\n      ") || "/* no validation rules configured */";

      const code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const data = event.payload;
      const errors = [];
      ${rulesCode}
      const valid = errors.length === 0;
      if (!valid && '${config.onFailure}' === 'error') {
        throw new Error(\`Validation failed: \${errors.map(e => e.message).join(', ')}\`);
      }
      return { valid, errors, data: valid ? data : null, message: valid ? 'Validation passed' : 'Validation failed' };
    });`;

      return {
        code,
        requiredBindings: [],
      };
    });
  },
};
