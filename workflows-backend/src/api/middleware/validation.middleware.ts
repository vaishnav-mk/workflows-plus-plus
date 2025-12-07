import { z } from "zod";
import { zValidator as zv } from "@hono/zod-validator";
import { ValidationTargets } from "hono";
import { HTTP_STATUS_CODES } from "../../core/constants";
import { ErrorCode } from "../../core/enums";

export const zValidator = <
  T extends z.ZodTypeAny,
  Target extends keyof ValidationTargets
>(
  target: Target,
  schema: T
) =>
  zv(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: `${target} validation failed`,
          code: ErrorCode.VALIDATION_ERROR,
          details: result.error.errors.map(err => ({
            path: err.path.join("."),
            message: err.message
          }))
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
  });
