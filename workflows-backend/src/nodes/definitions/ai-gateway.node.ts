import { z } from "zod";

const AIGatewayConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "cloudflare"]).default("cloudflare"),
  model: z.string().default("@cf/meta/llama-3.1-8b-instruct"),
  prompt: z.string(),
  cacheTTL: z.number().min(0).max(86400).default(3600),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(4096).optional(),
});

export const AIGatewayNode = {
  metadata: {
    type: "ai-gateway",
    name: "AI Gateway",
    description: "Proxy to AI models with caching",
    category: "ai" as const,
    version: "1.0.0",
    icon: "Brain",
    color: "#10B981",
    tags: ["ai", "llm", "cache"],
  },
  configSchema: AIGatewayConfigSchema,
  inputPorts: [
    { id: "trigger", label: "Execute", type: "any" as const, description: "Trigger AI request", required: true },
  ],
  outputPorts: [
    { id: "response", label: "Response", type: "object" as const, description: "AI response", required: false },
    { id: "text", label: "Text", type: "string" as const, description: "Response text", required: false },
  ],
  bindings: [
    {
      type: "AI",
      name: "AI",
      required: true,
      description: "Cloudflare AI binding"
    },
    {
      type: "KV",
      name: "KV",
      required: false,
      description: "KV namespace for caching"
    }
  ],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: true,
    isAsync: true,
    canFail: true,
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
        provider: "cloudflare",
        model: "@cf/meta/llama-3.1-8b-instruct",
        prompt: "What is the weather?",
        cacheTTL: 3600,
        temperature: 0.7
      }
    }
  ],
  presetOutput: {
    response: { text: "AI response", usage: {} },
    text: "AI response"
  }
};



