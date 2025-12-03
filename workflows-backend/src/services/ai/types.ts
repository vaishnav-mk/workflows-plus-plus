/**
 * AI Gateway Service Types
 */

export interface AIGenerationRequest {
  text?: string;
  image?: string;
  options?: AIGenerationOptions;
}

export interface AIGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  includeCatalog?: boolean;
}

export interface AIGenerationResponse {
  workflow: {
    id: string;
    name: string;
    description: string;
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: {
        label: string;
        type: string;
        config?: Record<string, unknown>;
      };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  };
  confidence?: number;
  reasoning?: string;
}

export interface AIGatewayConfig {
  url: string;
  token: string;
  timeout?: number;
  maxRetries?: number;
}

