/**
 * Workers AI Node - Simple AI model call using Cloudflare Workers AI
 */

import { z } from "zod";
import { Effect } from "effect";
import {
  WorkflowNodeDefinition,
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

/**
 * Sanitize a string to be a valid JavaScript identifier
 * Replaces hyphens and other invalid characters with underscores
 */
function sanitizeIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
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
      let prompt: string;
      const hasTemplate =
        typeof config.prompt === "string" && config.prompt.includes("{{");

      if (hasTemplate) {
        // Convert template string to JavaScript template literal
        // Replace {{...}} with ${...} and resolve the inner expression
        const templateParts = config.prompt.split(/\{\{([^}]+)\}\}/g);
        let templateLiteral = "`";

        for (let i = 0; i < templateParts.length; i++) {
          if (i % 2 === 0) {
            // Static text - escape backticks, $, and backslashes
            templateLiteral += templateParts[i]
              .replace(/\\/g, "\\\\")
              .replace(/`/g, "\\`")
              .replace(/\$/g, "\\$");
          } else {
            // Template expression - resolve and convert to ${...}
            const expr = templateParts[i].trim();
            let jsExpr: string;

            if (expr.startsWith(TEMPLATE_PATTERNS.STATE_PREFIX)) {
              const path = expr.substring(
                TEMPLATE_PATTERNS.STATE_PREFIX.length
              );
              const [nodeId, ...rest] = path.split(
                TEMPLATE_PATTERNS.PATH_SEPARATOR
              );
              const tail = rest.length ? "." + rest.join(".") : ".output";
              jsExpr = `_workflowState['${nodeId}']${tail}`;
            } else {
              const [nodeRef, ...rest] = expr.split(
                TEMPLATE_PATTERNS.PATH_SEPARATOR
              );
              const mappedStepName = graphContext.stepNameMap.get(nodeRef);
              if (mappedStepName) {
                const tail = rest.length ? "." + rest.join(".") : "";
                const sanitizedMappedStepName = sanitizeIdentifier(
                  mappedStepName
                );
                jsExpr = `_workflowResults.${sanitizedMappedStepName}${tail}`;
              } else {
                const tail = rest.length ? "." + rest.join(".") : ".output";
                jsExpr = `_workflowState['${nodeRef}']${tail}`;
              }
            }
            // Wrap the expression in JSON.stringify() to ensure values are properly stringified in the prompt
            templateLiteral += "${JSON.stringify(" + jsExpr + ")}";
          }
        }
        templateLiteral += "`";
        prompt = templateLiteral;
      } else {
        prompt = JSON.stringify(config.prompt);
      }

      const model = config.model
        ? JSON.stringify(config.model)
        : JSON.stringify("@cf/meta/llama-3.1-8b-instruct");
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

      // Sanitize stepName for use as JavaScript identifier (replace hyphens with underscores)
      const sanitizedStepName = sanitizeIdentifier(stepName);

      const code = `
    _workflowResults.${sanitizedStepName} = await step.do('${stepName}', async () => {
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
