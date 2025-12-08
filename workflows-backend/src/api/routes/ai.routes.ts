/**
 * AI Workflow Routes
 */

import { Hono } from "hono";
import { z } from "zod";
import { HTTP_STATUS_CODES, MESSAGES, AI_GATEWAY } from "../../core/constants";
import { ApiResponse } from "../../core/api-contracts";
import { AIGatewayService } from "../../services/ai/ai-gateway.service";
import { logger } from "../../core/logging/logger";
import { GenerateWorkflowSchema } from "../../core/validation/schemas";
import { safe } from "../../core/utils/route-helpers";
import { zValidator } from "../../api/middleware/validation.middleware";

interface Env {
  AI_GATEWAY_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  [key: string]: unknown;
}

const app = new Hono<{ Bindings: Env }>();

// generate workflow from ai
app.post(
  "/generate",
  zValidator("json", GenerateWorkflowSchema),
  safe(async c => {
    logger.info("Generating workflow with AI");

    const { text, image } = c.req.valid("json") as z.infer<
      typeof GenerateWorkflowSchema
    >;

    const aiService = new AIGatewayService({
      url: c.env.AI_GATEWAY_URL!,
      token: c.env.AI_GATEWAY_TOKEN!,
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
  })
);

export default app;
