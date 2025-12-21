import { tokenStorage } from "@/lib/token-storage";
import type { ApiResponse, ApiErrorResponse, ApiSuccessResponse } from "./types";
import { HTTP_STATUS } from "@/config/constants";
import { ROUTES } from "@/config/constants";

export function requestInterceptor(
  url: string,
  options: RequestInit
): RequestInit {
  const token = tokenStorage.getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    const headersRecord = headers as Record<string, string>;
    headersRecord["Authorization"] = `Bearer ${token}`;
  }

  return {
    ...options,
    headers,
  };
}

export async function responseInterceptor<T>(
  response: Response
): Promise<ApiResponse<T> | ApiErrorResponse> {
  if (response.status === HTTP_STATUS.UNAUTHORIZED) {
    tokenStorage.removeToken();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith(ROUTES.SETUP)
    ) {
      window.location.href = ROUTES.SETUP;
    }
    return {
      success: false,
      error: "Unauthorized",
      message: "Please configure Cloudflare credentials",
    };
  }

  if (!response.ok) {
    try {
      const errorData = await response.json();
      if (errorData && typeof errorData === 'object' && 'success' in errorData) {
        return errorData as ApiErrorResponse;
      }
      return {
        success: false,
        error: errorData?.error || errorData?.message || `HTTP ${response.status}`,
        message: errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }

  try {
    const data = await response.json();
    
    if (data && typeof data === 'object' && 'success' in data) {
      return data as ApiResponse<T>;
    }
    
    if (Array.isArray(data)) {
      return {
        success: true,
        data: data as T,
        message: "Request successful",
      } as ApiSuccessResponse<T>;
    }
    
    if (data && typeof data === 'object') {
      return {
        success: true,
        data: data as T,
        message: "Request successful",
      } as ApiSuccessResponse<T>;
    }
    
    return {
      success: false,
      error: "Invalid response format",
      message: "Response is not in expected format",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function errorInterceptor(error: unknown): ApiErrorResponse {
  return {
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
    message: error instanceof Error ? error.message : "Unknown error",
  };
}
