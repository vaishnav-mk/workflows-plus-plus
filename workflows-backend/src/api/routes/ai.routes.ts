/**
 * AI Workflow Routes
 */

import { Hono } from "hono";
import { HTTP_STATUS_CODES, MESSAGES, AI_GATEWAY } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../core/api-contracts";
import { AIGatewayService } from "../../services/ai/ai-gateway.service";
import { logger } from "../../core/logging/logger";
import {
  validateBody,
  validationErrorResponse
} from "../../core/validation/validator";
import { GenerateWorkflowSchema } from "../../core/validation/schemas";

interface Env {
  AI_GATEWAY_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  [key: string]: unknown;
}

const app = new Hono<{ Bindings: Env }>();

// Generate workflow from AI (text or image)
app.post("/generate", async c => {
  try {
    logger.info("Generating workflow with AI");

    // Validate request body
    const bodyValidation = await validateBody(c, GenerateWorkflowSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }

    const { text, image } = bodyValidation.data;

    const env = c.env;
    if (!env.AI_GATEWAY_URL || !env.AI_GATEWAY_TOKEN) {
      logger.error("AI Gateway not configured");
      return c.json(
        {
          success: false,
          error: "AI Gateway not configured",
          message: "AI_GATEWAY_URL and AI_GATEWAY_TOKEN must be set",
          code: ErrorCode.AI_GATEWAY_ERROR
        },
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }

    const aiService = new AIGatewayService({
      url: env.AI_GATEWAY_URL,
      token: env.AI_GATEWAY_TOKEN,
      timeout: AI_GATEWAY.TIMEOUT_MS,
      maxRetries: AI_GATEWAY.MAX_RETRIES
    });

    const result = await aiService.generateWorkflow({
      text,
      image,
      options: {
        includeCatalog: true,
        temperature: AI_GATEWAY.DEFAULT_TEMPERATURE,
        maxTokens: AI_GATEWAY.MAX_TOKENS
      }
    });

    const response: ApiResponse = {
      success: true,
      data: result.workflow,
      message: MESSAGES.WORKFLOW_GENERATED
    };

    logger.info("Workflow generated successfully", {
      workflowId: result.workflow.id,
      confidence: result.confidence
    });

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error(
      "Failed to generate workflow",
      error instanceof Error ? error : new Error(String(error))
    );
    return c.json(
      {
        success: false,
        error: "Failed to generate workflow",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.AI_GATEWAY_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;
