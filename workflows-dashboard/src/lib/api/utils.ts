import type { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from "./types";

export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

export function isErrorResponse(
  response: ApiResponse<unknown>
): response is ApiErrorResponse {
  return response.success === false;
}

export function getResponseData<T>(response: ApiResponse<T>): T {
  if (isSuccessResponse(response)) {
    return response.data;
  }
  throw new Error(response.error || "Unknown error");
}

export function getResponseError(response: ApiResponse<unknown>): string {
  if (isErrorResponse(response)) {
    return response.error;
  }
  return "";
}

