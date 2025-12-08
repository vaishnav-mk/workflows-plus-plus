import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenContext, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, BindingType, ErrorCode } from "../../core/enums";
import { BINDING_NAMES, TEMPLATE_PATTERNS } from "../../core/constants";

const KVGetConfigSchema = z.object({
  namespace: z.string().default(BINDING_NAMES.DEFAULT_KV).describe("binding:kv"),
  key: z.string().min(1),
  type: z.enum(["json", "text", "arrayBuffer"]).default("json"),
  throwIfMissing: z.boolean().default(false),
});

type KVGetConfig = z.infer<typeof KVGetConfigSchema>;

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

export const KVGetNode: WorkflowNodeDefinition<KVGetConfig> = {
  metadata: {
    type: NodeType.KV_GET,
    name: "KV Get",
    description: "Read data from Workers KV storage",
    category: NodeCategory.STORAGE,
    version: "1.0.0",
    icon: "Database",
    color: "#F59E0B",
    tags: ["kv", "storage", "read"],
  },
  configSchema: KVGetConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Trigger read",
      required: true,
    },
  ],
  outputPorts: [
    {
      id: "value",
      label: "Value",
      type: DataType.ANY,
      description: "Retrieved value",
      required: false,
    },
    {
      id: "metadata",
      label: "Metadata",
      type: DataType.OBJECT,
      description: "KV metadata",
      required: false,
    },
    {
      id: "exists",
      label: "Exists",
      type: DataType.BOOLEAN,
      description: "Whether key exists",
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
      name: "Get User",
      description: "Retrieve user data from KV",
      config: { namespace: "USERS_KV", key: "user-123", type: "json" },
    },
  ],
  presetOutput: {
    value: { id: "user-123", name: "John Doe", email: "john@example.com" },
    exists: true,
    metadata: { key: "user-123" },
  },
  codegen: ({ nodeId, config, stepName, graphContext }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const namespace = (config.namespace || BINDING_NAMES.DEFAULT_KV).replace(/[^a-zA-Z0-9_]/g, "_");
      const keyExpr = resolveKeyExpression(config.key, graphContext);
      const inputData = graphContext.edges
        .filter(e => e.target === nodeId)
        .map(e => `_workflowState['${e.source}']?.output || event.payload`)[0] || "event.payload";

      const code = `
    _workflowResults.${stepName} = await step.do("${stepName}", async () => {
      const inputData = ${inputData};
      const key = \`${keyExpr}\`;
      const value = await this.env["${namespace}"].get(key, { type: "${config.type}" });
      const result = {
        value,
        exists: value !== null,
        metadata: value ? { key } : null
      };
      ${config.throwIfMissing ? `if (!value) throw new Error("Key not found: " + key);` : ""}
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
