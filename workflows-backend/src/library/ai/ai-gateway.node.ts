import { z } from "zod";
import { Effect } from "effect";
import {
  WorkflowNodeDefinition,
  CodeGenResult
} from "../../core/types";
import {
  NodeCategory,
  DataType,
  BindingType,
  ErrorCode
} from "../../core/enums";

const AIGatewayConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.7),
  maxTokens: z.number().min(1).max(4096).default(2048),
  prompt: z.string()
});

type AIGatewayConfig = z.infer<typeof AIGatewayConfigSchema>;

export const AIGatewayNode: WorkflowNodeDefinition<AIGatewayConfig> = {
  metadata: {
    type: "ai-gateway",
    name: "AI Gateway",
    description: "Generate content using AI Gateway",
    category: NodeCategory.AI,
    icon: "Brain",
    version: "1.0.0",
    tags: ["ai", "llm", "generation"]
  },
  configSchema: AIGatewayConfigSchema,
  inputPorts: [
    {
      id: "input",
      label: "Input",
      type: DataType.STRING,
      description: "Input text for prompt template",
      required: true
    }
  ],
  outputPorts: [
    {
      id: "output",
      label: "Output",
      type: DataType.STRING,
      description: "Generated content",
      required: true
    }
  ],
  bindings: [
    {
      type: BindingType.AI,
      name: "AI",
      required: true,
      description: "AI Binding"
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
      name: "Simple Generation",
      description: "Generate text from prompt",
      config: {
        prompt: "Write a haiku about {{input}}",
        temperature: 0.7
      },
      expectedOutput: "Generated haiku..."
    }
  ],
  codegen: (ctx): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const { nodeId, config, stepName } = ctx;
      
      const promptTemplate = config.prompt;
      
      const code = `
        const input = _workflowState['${ctx.prevStepId}']?.output || event.payload;
        const prompt = \`${promptTemplate.replace(/{{input}}/g, "${input}")}\`;
        
        const response = await step.do('${stepName}', async () => {
          const result = await env.AI.run('${config.model || "@cf/meta/llama-3-8b-instruct"}', {
            prompt,
            temperature: ${config.temperature},
            max_tokens: ${config.maxTokens}
          });
          return result.response;
        });
        
        _workflowResults.${stepName} = response;
        _workflowState['${nodeId}'] = { output: response };
      `;

      return {
        code,
        requiredBindings: [
          {
            type: BindingType.AI,
            name: "AI",
            description: "AI Binding"
          }
        ]
      };
    });
  }
};
