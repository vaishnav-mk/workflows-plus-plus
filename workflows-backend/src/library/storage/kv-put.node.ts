import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenContext, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, BindingType, ErrorCode } from "../../core/enums";
import { BINDING_NAMES, TEMPLATE_PATTERNS } from "../../core/constants";

const KVPutConfigSchema = z.object({
  namespace: z.string().default(BINDING_NAMES.DEFAULT_KV).describe("binding:kv"),
  key: z.string().min(1),
  value: z.object({
    type: z.enum(["static", "variable", "expression"]),
    content: z.any(),
  }),
  options: z.object({
    expirationTtl: z.number().optional(),
    expiration: z.number().optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
});

type KVPutConfig = z.infer<typeof KVPutConfigSchema>;

function resolveKeyExpression(
  key: string,
  graphContext: CodeGenContext["graphContext"]
): string {
  if (key.includes("{{")) {
    return key.replace(TEMPLATE_PATTERNS.TEMPLATE_REGEX, (_match, innerExpr) => {
      const trimmed = innerExpr.trim();
      if (trimmed.startsWith(TEMPLATE_PATTERNS.STATE_PREFIX)) {
        const path = trimmed.substring(TEMPLATE_PATTERNS.STATE_PREFIX.length);
        const [nodeId, ...rest] = path.split(TEMPLATE_PATTERNS.PATH_SEPARATOR);
        const tail = rest.length ? "." + rest.join(".") : ".output";
        return `\${_workflowState['${nodeId}']${tail}}`;
      }
      const [nodeRef, ...rest] = trimmed.split(TEMPLATE_PATTERNS.PATH_SEPARATOR);
      const stepName = graphContext.stepNameMap.get(nodeRef);
      if (stepName) {
        const tail = rest.length ? "." + rest.join(".") : "";
        return `\${_workflowResults.${stepName}${tail}}`;
      }
      const tail = rest.length ? "." + rest.join(".") : ".output";
      return `\${_workflowState['${nodeRef}']${tail}}`;
    });
  }
  return `'${key}'`;
}

function resolveValueContent(
  value: KVPutConfig["value"],
  graphContext: CodeGenContext["graphContext"]
): string {
  if (value.type === "static") {
    return JSON.stringify(value.content);
  } else if (value.type === "variable" || value.type === "expression") {
    const content = value.content;
    if (typeof content === "string" && content.includes("{{")) {
      return content.replace(TEMPLATE_PATTERNS.TEMPLATE_REGEX, (_match, innerExpr) => {
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
    return content;
  }
  return JSON.stringify(value.content);
}

export const KVPutNode: WorkflowNodeDefinition<KVPutConfig> = {
  metadata: {
    type: NodeType.KV_PUT,
    name: "KV Put",
    description: "Write data to Workers KV storage",
    category: NodeCategory.STORAGE,
    version: "1.0.0",
    icon: "Save",
    color: "#F59E0B",
    tags: ["kv", "storage", "write"],
  },
  configSchema: KVPutConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Trigger write",
      required: true,
    },
  ],
  outputPorts: [
    {
      id: "success",
      label: "Success",
      type: DataType.BOOLEAN,
      description: "Write successful",
      required: false,
    },
    {
      id: "key",
      label: "Key",
      type: DataType.STRING,
      description: "Key that was written",
      required: false,
    },
  ],
  bindings: [
    {
      type: BindingType.KV,
      name: BINDING_NAMES.DEFAULT_KV,
      required: true,
      description: "Workers KV namespace binding",
    },
  ],
  capabilities: {
    playgroundCompatible: false,
    supportsRetry: true,
    isAsync: true,
    canFail: true,
  },
  validation: {
    rules: [],
    errorMessages: {},
  },
  examples: [
    {
      name: "Save User",
      description: "Store user data in KV",
      config: { namespace: "USERS_KV", key: "user-123", value: { type: "static", content: { name: "John" } } },
    },
  ],
  presetOutput: {
    success: true,
    key: "user-123",
  },
  codegen: ({ nodeId, config, stepName, graphContext }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const namespace = (config.namespace || BINDING_NAMES.DEFAULT_KV).replace(/[^a-zA-Z0-9_]/g, "_");
      const keyExpr = resolveKeyExpression(config.key, graphContext);
      const valueContent = resolveValueContent(config.value, graphContext);
      const inputData = graphContext.edges
        .filter(e => e.target === nodeId)
        .map(e => `_workflowState['${e.source}']?.output || event.payload`)[0] || "event.payload";

      const optionLines: string[] = [];
      if (config.options?.expirationTtl) {
        optionLines.push(`expirationTtl: ${config.options.expirationTtl}`);
      }
      if (config.options?.expiration) {
        optionLines.push(`expiration: ${config.options.expiration}`);
      }
      if (config.options?.metadata && Object.keys(config.options.metadata).length > 0) {
        optionLines.push(`metadata: ${JSON.stringify(config.options.metadata)}`);
      }
      const optionsObject = optionLines.length > 0
        ? `, {\n        ${optionLines.join(",\n        ")}\n      }`
        : "";

      const code = `
    _workflowResults.${stepName} = await step.do("${stepName}", async () => {
      const inputData = ${inputData};
      const key = \`${keyExpr}\`;
      const value = ${valueContent};
      await this.env["${namespace}"].put(key, value${optionsObject});
      const result = { success: true, key };
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: result
      };
      return result;
    });`;

      return {
        code,
        requiredBindings: [{ name: namespace, type: BindingType.KV }],
      };
    });
  },
};
