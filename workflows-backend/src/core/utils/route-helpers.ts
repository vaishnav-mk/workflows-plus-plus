import { Context, Env, Input } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { ErrorCode } from "../enums";
import { parseCloudflareError } from "./cloudflare-error-handler";
import { logger } from "../logging/logger";
import { ApiResponse } from "../api-contracts";

export const createSuccessResponse = <T>(
  data: T,
  message = "Success"
): ApiResponse<T> => ({
  success: true,
  data,
  message
});

export const createErrorResponse = (
  message: string,
  error = "Internal Server Error",
  code = ErrorCode.INTERNAL_ERROR
): ApiResponse => ({
  success: false,
  error,
  message,
  code
});

export const ensureEnv = <T>(env: T, keys: (keyof T)[]): void => {
  const missing = keys.filter(key => !env[key]);
  if (missing.length > 0) {
    const message = `missing environment variables: ${missing.join(", ")}`;
    throw new Error(message);
  }
};

export const ensureDeploymentDO = (env: {
  DEPLOYMENT_DO?: DurableObjectNamespace;
}): DurableObjectNamespace => {
  if (!env.DEPLOYMENT_DO) {
    throw new Error("deployment_do binding required");
  }
  return env.DEPLOYMENT_DO;
};

export const safe = <
  E extends Env = any,
  P extends string = any,
  I extends Input = any
>(
  fn: (c: Context<E, P, I>) => Promise<Response> | Response
) => async (c: Context<E, P, I>) => {
  try {
    return await fn(c);
  } catch (error) {
    const parsedError = parseCloudflareError(error);

    logger.error(
      parsedError.message,
      error instanceof Error ? error : new Error(String(error))
    );

    return c.json(
      {
        success: false,
        error: parsedError.errorCode,
        message: parsedError.message,
        code: parsedError.errorCode
      },
      parsedError.statusCode as ContentfulStatusCode
    );
  }
};
