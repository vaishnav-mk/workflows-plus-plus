/**
 * Centralized Validation Utility
 * Provides type-safe request validation using Zod schemas
 */

import { Context } from "hono";
import { z } from "zod";
import { HTTP_STATUS_CODES } from "../constants";
import { ErrorCode } from "../enums";
import { ErrorResponse } from "../api-contracts";

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: ErrorResponse;
}

export type ValidationOutput<T> = ValidationResult<T> | ValidationError;

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T extends z.ZodTypeAny>(
  c: Context,
  schema: T
): Promise<ValidationOutput<z.infer<T>>> {
  try {
    const body = await c.req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: {
          success: false,
          error: "Validation failed",
          message: "Request body validation failed",
          code: ErrorCode.VALIDATION_ERROR,
          details: result.error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message
          }))
        }
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: {
        success: false,
        error: "Invalid JSON",
        message: "Request body must be valid JSON",
        code: ErrorCode.VALIDATION_ERROR
      }
    };
  }
}

/**
 * Validate request query parameters against a Zod schema
 */
export function validateQuery<T extends z.ZodTypeAny>(
  c: Context,
  schema: T
): ValidationOutput<z.infer<T>> {
  const url = new URL(c.req.url);
  const query = Object.fromEntries(
    Array.from(url.searchParams.entries())
  );
  const result = schema.safeParse(query);

  if (!result.success) {
    return {
      success: false,
      error: {
        success: false,
        error: "Validation failed",
        message: "Query parameters validation failed",
        code: ErrorCode.VALIDATION_ERROR,
        details: result.error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message
        }))
      }
    };
  }

  return {
    success: true,
    data: result.data
  };
}

/**
 * Validate request path parameters against a Zod schema
 */
export function validateParams<T extends z.ZodTypeAny>(
  c: Context,
  schema: T
): ValidationOutput<z.infer<T>> {
  const params = c.req.param();
  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      error: {
        success: false,
        error: "Validation failed",
        message: "Path parameters validation failed",
        code: ErrorCode.VALIDATION_ERROR,
        details: result.error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message
        }))
      }
    };
  }

  return {
    success: true,
    data: result.data
  };
}

/**
 * Helper to return validation error response
 */
export function validationErrorResponse(
  validationResult: ValidationError
): Response {
  return new Response(
    JSON.stringify(validationResult.error),
    {
      status: HTTP_STATUS_CODES.BAD_REQUEST,
      headers: { "Content-Type": "application/json" }
    }
  );
}

