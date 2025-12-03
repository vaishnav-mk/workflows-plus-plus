/**
 * AI Gateway Service
 * Handles AI-powered workflow generation using Vercel AI SDK with Gemini
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { AIGenerationRequest, AIGenerationResponse, AIGatewayConfig } from "./types";
import { AIGatewayError, AIGatewayTimeoutError } from "./errors";
import { ErrorCode } from "../../core/enums";
import { AI_GATEWAY } from "../../core/constants";
import { logger } from "../../core/logging/logger";
import { buildWorkflowGenerationPrompt } from "./prompts";
import { generateWorkflowId } from "../../core/utils/id-generator";

export class AIGatewayService {
  private config: AIGatewayConfig;
  private maxRetries: number;
  private timeout: number;

  constructor(config: AIGatewayConfig) {
    this.config = config;
    this.maxRetries = config.maxRetries || AI_GATEWAY.MAX_RETRIES;
    this.timeout = config.timeout || AI_GATEWAY.TIMEOUT_MS;

    logger.info("AIGatewayService initialized", {
      url: this.config.url,
      timeout: this.timeout,
      maxRetries: this.maxRetries
    });
  }

  async generateWorkflow(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const startTime = Date.now();
    logger.info("Generating workflow with AI");

    try {
      const response = await this.callGeminiAPI(request);
      const duration = Date.now() - startTime;

      logger.logPerformance("ai_generation", duration, {
        workflowId: response.workflow.id
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("AI workflow generation failed", error instanceof Error ? error : new Error(errorMessage), {
        duration
      });

      if (error instanceof AIGatewayError) {
        throw error;
      }

      throw new AIGatewayError(
        ErrorCode.AI_GATEWAY_ERROR,
        `AI workflow generation failed: ${errorMessage}`,
        { originalError: String(error) }
      );
    }
  }

  private async callGeminiAPI(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`AI Gateway API call attempt ${attempt}/${this.maxRetries}`);

        const prompt = buildWorkflowGenerationPrompt(
          request.text || "",
          request.options?.includeCatalog ?? true
        );

        const googleProvider = createGoogleGenerativeAI({ apiKey: this.config.token });
        const model = googleProvider(request.options?.model || 'gemini-2.5-flash-lite');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const baseConfig = {
            model,
            maxRetries: AI_GATEWAY.MAX_RETRIES,
            temperature: AI_GATEWAY.DEFAULT_TEMPERATURE,
            abortSignal: controller.signal,
            experimental_telemetry: { isEnabled: AI_GATEWAY.EXPERIMENTAL_TELEMETRY }
          };

          const result = request.image
            ? await generateText({
                ...baseConfig,
                messages: [{
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    { 
                      type: 'image', 
                      image: request.image.startsWith('data:') 
                        ? request.image 
                        : `data:image/png;base64,${request.image}`
                    }
                  ]
                }]
              })
            : await generateText({ ...baseConfig, prompt });

          clearTimeout(timeoutId);

          if (!result.text?.trim()) {
            throw new AIGatewayError(
              ErrorCode.AI_GATEWAY_ERROR,
              "AI Gateway returned empty response",
              { attempt }
            );
          }

          return this.parseAIResponse(result.text);
        } catch (fetchError: unknown) {
          clearTimeout(timeoutId);

          if (fetchError instanceof Error && fetchError.name === "AbortError") {
            throw new AIGatewayTimeoutError(
              `AI Gateway request timed out after ${this.timeout}ms`,
              { attempt }
            );
          }

          throw fetchError;
        }
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          const delay = AI_GATEWAY.RETRY_DELAY_MS * attempt;
          logger.warn(`AI Gateway attempt ${attempt} failed, retrying in ${delay}ms`, {
            error: lastError.message,
            attempt
          });
          await this.sleep(delay);
        }
      }
    }

    throw new AIGatewayError(
      ErrorCode.AI_GATEWAY_ERROR,
      `AI Gateway failed after ${this.maxRetries} attempts: ${lastError?.message || "Unknown error"}`,
      { maxRetries: this.maxRetries }
    );
  }

  private extractJsonFromMarkdown(content: string): string {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }

    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      return content.substring(jsonStart, jsonEnd + 1);
    }

    return content.trim();
  }

  private parseAIResponse(content: string): AIGenerationResponse {
    try {
      const cleanedContent = this.extractJsonFromMarkdown(content);
      const parsed = JSON.parse(cleanedContent) as AIGenerationResponse;

      if (!parsed.workflow?.nodes || !parsed.workflow?.edges) {
        throw new Error("Invalid workflow structure in AI response");
      }

      // Always generate standardized workflow ID
      parsed.workflow.id = parsed.workflow.id || generateWorkflowId();

      // Assign standardized node IDs
      const entryNode = parsed.workflow.nodes.find((n: any) => n.type === 'entry');
      const returnNodes = parsed.workflow.nodes.filter((n: any) => n.type === 'return');
      const transformNodes = parsed.workflow.nodes.filter((n: any) => n.type === 'transform');
      
      parsed.workflow.nodes = parsed.workflow.nodes.map((node: any, index: number) => {
        let nodeId = node.id;
        if (!nodeId) {
          if (node.type === 'entry') {
            nodeId = 'step_entry_0';
          } else if (node.type === 'return') {
            nodeId = `step_return_${parsed.workflow.nodes.length - 1}`;
          } else if (node.type === 'transform') {
            const transformIndex = transformNodes.indexOf(node);
            nodeId = `step_transform_${transformIndex}`;
          } else {
            nodeId = `step_${node.type}_${index}`;
          }
        }
        
        return {
          ...node,
          id: nodeId,
          position: node.position || { x: 100 + index * 200, y: 100 },
          data: {
            ...node.data,
            label: node.data?.label || node.type,
            type: node.type
          }
        };
      });

      parsed.workflow.edges = parsed.workflow.edges.map((edge, index) => ({
        ...edge,
        id: edge.id || `edge-${index}`
      }));

      return parsed;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Failed to parse AI response", error instanceof Error ? error : new Error(errorMessage), {
        content: content.substring(0, 500)
      });

      throw new AIGatewayError(
        ErrorCode.AI_GATEWAY_ERROR,
        `Failed to parse AI response: ${errorMessage}`,
        { content: content.substring(0, 200) }
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
