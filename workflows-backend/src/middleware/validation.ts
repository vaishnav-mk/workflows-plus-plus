import { Context, Next } from "hono";
import { ErrorResponse } from "../types/api";

export const validateJson = async (c: Context, next: Next) => {
  const contentType = c.req.header("Content-Type");

  if (
    c.req.method === "POST" ||
    c.req.method === "PUT" ||
    c.req.method === "PATCH"
  ) {
    if (!contentType || !contentType.includes("application/json")) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Invalid Content-Type",
        message: "Content-Type must be application/json",
        code: "INVALID_CONTENT_TYPE"
      };

      return c.json(errorResponse, 400);
    }
  }

  await next();
};

export const validateWorkflowId = async (c: Context, next: Next) => {
  const id = c.req.param("id");

  if (!id) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: "Missing Workflow ID",
      message: "Workflow ID is required",
      code: "MISSING_WORKFLOW_ID"
    };

    return c.json(errorResponse, 400);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: "Invalid Workflow ID",
      message: "Workflow ID must be a valid UUID",
      code: "INVALID_WORKFLOW_ID"
    };

    return c.json(errorResponse, 400);
  }

  await next();
};
