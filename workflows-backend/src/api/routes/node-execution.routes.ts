import { Hono } from "hono";
import { z } from "zod";
import { HTTP_STATUS_CODES, MESSAGES } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../types/api";
import { NodeExecutionService } from "../../services/execution/node-execution.service";
import { logger } from "../../core/logging/logger";
import { ExecuteNodeSchema, ValidateNodeSchema } from "../../core/validation/schemas";
import { safe } from "../../core/utils/route-helpers";
import { zValidator } from "../../api/middleware/validation.middleware";

const app = new Hono();

const executionService = new NodeExecutionService();
app.post("/execute", zValidator('json', ExecuteNodeSchema), safe(async (c) => {
  logger.info("Executing node");
  
  const { type, config, inputData } = c.req.valid('json') as z.infer<typeof ExecuteNodeSchema>;

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
}));
app.post("/validate", zValidator('json', ValidateNodeSchema), safe(async (c) => {
  logger.info("Validating node configuration");
  
  const { type, config } = c.req.valid('json') as z.infer<typeof ValidateNodeSchema>;

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
}));

export default app;
