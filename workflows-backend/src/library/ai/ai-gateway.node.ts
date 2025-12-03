/**
 * Workers AI Node - Simple AI model call using Cloudflare Workers AI
 */

import { z } from "zod";
import { Effect } from "effect";
import {
  WorkflowNodeDefinition,
  CodeGenContext,
  CodeGenResult
} from "../../core/types";
import {
  NodeType,
  NodeCategory,
  DataType,
  BindingType,
  ErrorCode
} from "../../core/enums";
import { TEMPLATE_PATTERNS } from "../../core/constants";

const WorkersAIConfigSchema = z.object({
  model: z.string().default("@cf/meta/llama-3.1-8b-instruct"),
  prompt: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4096).optional()
});

type WorkersAIConfig = z.infer<typeof WorkersAIConfigSchema>;

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

export const WorkersAINode: WorkflowNodeDefinition<WorkersAIConfig> = {
  metadata: {
    type: NodeType.WORKERS_AI,
    name: "Workers AI",
    description: "Call AI models using Cloudflare Workers AI",
    category: NodeCategory.AI,
    version: "1.0.0",
    icon: "Brain",
    color: "#10B981",
    tags: ["ai", "llm"]
  },
  configSchema: WorkersAIConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Trigger AI request",
      required: true
    }
  ],
  outputPorts: [
    {
      id: "response",
      label: "Response",
      type: DataType.OBJECT,
      description: "AI response",
      required: false
    },
    {
      id: "text",
      label: "Text",
      type: DataType.STRING,
      description: "Response text",
      required: false
    }
  ],
  bindings: [
    {
      type: BindingType.AI,
      name: "AI",
      required: true,
      description: "Cloudflare Workers AI binding"
    }
  ],
  capabilities: {
    playgroundCompatible: true,
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
      name: "Basic AI Call",
      description: "Call AI model with prompt",
      config: {
        model: "@cf/meta/llama-3.1-8b-instruct",
        prompt: "What is the origin of the phrase 'Hello, World'?",
        temperature: 0.7
      }
    }
  ],
  presetOutput: {
    response: { text: "AI response", usage: {} },
    text: "AI response"
  },
  codegen: ({
    nodeId,
    config,
    stepName,
    graphContext
  }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function*(_) {
      let prompt = config.prompt;
      if (typeof prompt === "string" && prompt.includes("{{")) {
        prompt = resolveTemplateExpression(prompt, graphContext);
      } else {
        prompt = JSON.stringify(prompt);
      }

      const model = JSON.stringify(config.model);
      const aiOptions: string[] = [];

      if (config.temperature !== undefined) {
        aiOptions.push(`temperature: ${config.temperature}`);
      }

      if (config.maxTokens !== undefined) {
        aiOptions.push(`max_tokens: ${config.maxTokens}`);
      }

      const aiOptionsStr =
        aiOptions.length > 0 ? `, ${aiOptions.join(", ")}` : "";

      const inputData =
        graphContext.edges
          .filter(e => e.target === nodeId)
          .map(
            e => `_workflowState['${e.source}']?.output || event.payload`
          )[0] || "event.payload";

      const code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      const response = await this.env.AI.run(${model}, {
        prompt: ${prompt}${aiOptionsStr}
      });
      const result = {
        response: response,
        text: response.response || response.text || JSON.stringify(response),
        usage: response.usage || {}
      };
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: result
      };
      return result;
    });`;

      return {
        code,
        requiredBindings: [{ name: "AI", type: BindingType.AI }]
      };
    });
  }
};
