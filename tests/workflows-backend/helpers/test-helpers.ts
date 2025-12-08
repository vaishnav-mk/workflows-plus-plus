/**
 * Test helper utilities
 */

// Type definition for credentials context
export interface CredentialsContext {
  apiToken: string;
  accountId: string;
}

// Base URL for the API - should match the running backend
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8787";

/**
 * Creates actual credentials for testing using the provided Cloudflare credentials
 */
export function createTestCredentials(): CredentialsContext {
  return {
    apiToken: "y8WYQMwuNQ-2nDDQYsxPeB6Q5hzR601I7zPpXYDC",
    accountId: "c714a393dbfabeb858a7dea729b5e8f8",
  };
}

let cachedAuthToken: string | null = null;

async function getAuthToken(): Promise<string> {
  if (cachedAuthToken) {
    return cachedAuthToken;
  }

  const credentials = createTestCredentials();
  try {
    const setupResponse = await fetch(`${API_BASE_URL}/api/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiToken: credentials.apiToken,
        accountId: credentials.accountId,
      }),
    });

    if (setupResponse.ok) {
      const data = await setupResponse.json();
      if (data.success && data.data?.token) {
        cachedAuthToken = data.data.token;
        console.log("[TEST] Successfully obtained auth token");
        return cachedAuthToken as string;
      }
    } else {
      const errorText = await setupResponse.text();
      console.warn("[TEST] Failed to get auth token from setup endpoint:", setupResponse.status, errorText.substring(0, 200));
    }
  } catch (error) {
    console.warn("[TEST] Error getting auth token:", error);
  }

  console.warn("[TEST] Using fallback authentication (relying on backend env vars)");
  return "dummy-token-for-auth-check";
}

export async function authenticatedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = new URL(path, API_BASE_URL);
  const token = await getAuthToken();
  
  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status >= 500) {
    await logErrorResponse(response, `${options.method || 'GET'} ${path}`);
  }

  return response;
}

/**
 * Helper to make unauthenticated requests to the actual API
 */
export async function unauthenticatedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = new URL(path, API_BASE_URL);
  const response = await fetch(url.toString(), options);
  
  // Log errors for debugging
  if (response.status >= 500) {
    await logErrorResponse(response, `${options.method || 'GET'} ${path} (unauthenticated)`);
  }
  
  return response;
}

/**
 * Parse JSON response with error logging
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`[TEST ERROR] Failed to parse JSON response from ${response.url}:`, text.substring(0, 500));
    throw error;
  }
}

/**
 * Log error response details
 */
export async function logErrorResponse(response: Response, context?: string): Promise<void> {
  if (response.status >= 400) {
    const text = await response.clone().text();
    let errorData: unknown;
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = text;
    }
    console.error(`[TEST ERROR]${context ? ` ${context}` : ''} ${response.status} ${response.url}:`, JSON.stringify(errorData, null, 2));
  }
}
