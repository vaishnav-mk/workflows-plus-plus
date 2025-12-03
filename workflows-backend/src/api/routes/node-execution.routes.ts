/**
 * Node Execution Routes
 */

import { Hono } from "hono";
import { HTTP_STATUS_CODES, MESSAGES } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../core/api-contracts";
import { NodeExecutionService } from "../../services/execution/node-execution.service";
import { logger } from "../../core/logging/logger";
import { validateBody, validationErrorResponse } from "../../core/validation/validator";
import { ExecuteNodeSchema, ValidateNodeSchema } from "../../core/validation/schemas";

const app = new Hono();

const executionService = new NodeExecutionService();

// Execute a node with test data
app.post("/execute", async (c) => {
  try {
    logger.info("Executing node");
    
    // Validate request body
    const bodyValidation = await validateBody(c, ExecuteNodeSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }
    
    const { type, config, inputData } = bodyValidation.data;

    const result = await executionService.executeNode({
      type,
      config,
      inputData
    });

    const response: ApiResponse = {
      success: result.success,
      data: {
        output: result.output,
        logs: result.logs
      },
      message: MESSAGES.NODE_EXECUTED
    };

    if (!result.success && result.error) {
      response.error = result.error.message;
    }

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to execute node", error instanceof Error ? error : new Error(errorMessage));
    return c.json(
      {
        success: false,
        error: "Failed to execute node",
        message: errorMessage,
        code: ErrorCode.EXECUTION_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Validate node configuration
app.post("/validate", async (c) => {
  try {
    logger.info("Validating node configuration");
    
    // Validate request body
    const bodyValidation = await validateBody(c, ValidateNodeSchema);
    if (!bodyValidation.success) {
      return validationErrorResponse(bodyValidation);
    }
    
    const { type, config } = bodyValidation.data;

    const { NodeRegistry } = await import("../../catalog/registry");
    const nodeDefinition = NodeRegistry.getNode(type);

    if (!nodeDefinition) {
      return c.json(
        {
          success: false,
          error: `Node type '${type}' not found`,
          code: ErrorCode.NODE_NOT_FOUND
        },
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }

    const validationResult = nodeDefinition.configSchema.safeParse(config);

    const response: ApiResponse = {
      success: true,
      data: {
        valid: validationResult.success,
        errors: validationResult.success
          ? []
          : validationResult.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
              path: e.path.join("."),
              message: e.message
            }))
      },
      message: MESSAGES.NODE_VALIDATED
    };

    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to validate node", error instanceof Error ? error : new Error(errorMessage));
    return c.json(
      {
        success: false,
        error: "Failed to validate node",
        message: errorMessage,
        code: ErrorCode.VALIDATION_ERROR
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;
