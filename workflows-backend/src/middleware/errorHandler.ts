import { Context } from "hono";
import { ErrorResponse } from "../types/api";

export const errorHandler = (error: Error, c: Context) => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: "Internal Server Error",
    message: error.message || "An unexpected error occurred",
    code: "INTERNAL_ERROR"
  };

  return c.json(errorResponse, 500);
};

export const notFoundHandler = (c: Context) => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: "Not Found",
    message: `Route ${c.req.method} ${c.req.url} not found`,
    code: "NOT_FOUND"
  };

  return c.json(errorResponse, 404);
};
