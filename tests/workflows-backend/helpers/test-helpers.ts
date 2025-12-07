/**
 * Test helper utilities
 */

import { SELF, env } from "cloudflare:test";
import type { CredentialsContext } from "../../../../workflows-backend/src/api/middleware/credentials.middleware";

/**
 * Creates actual credentials for testing using the provided Cloudflare credentials
 */
export function createTestCredentials(): CredentialsContext {
  return {
    apiToken: "y8WYQMwuNQ-2nDDQYsxPeB6Q5hzR601I7zPpXYDC",
    accountId: "c714a393dbfabeb858a7dea729b5e8f8",
  };
}

/**
 * Creates an encrypted credentials cookie for authentication
 * This is a test-specific implementation that works in Workers runtime
 */
export async function createEncryptedCredentialsCookie(): Promise<string> {
  const credentials = createTestCredentials();
  const masterKey = env.CREDENTIALS_MASTER_KEY || "test-master-key-for-credentials-encryption-12345";
  
  // Re-implement encryption logic for Workers runtime
  const PBKDF2_ITERATIONS = 100000;
  const SALT_LENGTH = 16;
  const IV_LENGTH = 12;
  
  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  // Derive encryption key
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterKey),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  const saltBuffer = new ArrayBuffer(salt.length);
  const saltView = new Uint8Array(saltBuffer);
  saltView.set(salt);
  
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
  
  // Encrypt credentials
  const plaintext = encoder.encode(JSON.stringify(credentials));
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    plaintext
  );
  
  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(
    SALT_LENGTH + IV_LENGTH + ciphertext.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);
  
  // Return base64-encoded string
  const chars: string[] = [];
  for (let i = 0; i < combined.length; i++) {
    chars.push(String.fromCharCode(combined[i]));
  }
  return btoa(chars.join(""));
}

/**
 * Creates a request with authentication cookie
 */
export async function createAuthenticatedRequest(
  url: string,
  options: RequestInit = {}
): Promise<Request> {
  const encryptedCookie = await createEncryptedCredentialsCookie();
  const req = new Request(url, {
    ...options,
    headers: {
      ...options.headers,
      Cookie: `cf_credentials=${encryptedCookie}`,
    },
  });
  return req;
}

/**
 * Creates a request with JSON body
 */
export function createJsonRequest(
  url: string,
  method: string,
  body: unknown,
  options: RequestInit = {}
): Request {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * Helper to make authenticated requests to the worker
 * Uses actual encrypted credentials cookie
 */
export async function authenticatedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = new URL(path, "http://localhost");
  const encryptedCookie = await createEncryptedCredentialsCookie();
  const request = new Request(url.toString(), {
    ...options,
    headers: {
      ...options.headers,
      Cookie: `cf_credentials=${encryptedCookie}`,
    },
  });
  return SELF.fetch(request);
}

/**
 * Helper to make unauthenticated requests
 */
export async function unauthenticatedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = new URL(path, "http://localhost");
  return SELF.fetch(url.toString(), options);
}

/**
 * Parse JSON response
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  return JSON.parse(text) as T;
}

/**
 * Mock Cloudflare API responses
 */
export function mockCloudflareAPI(
  fetchMock: import("undici").MockAgent,
  path: string,
  response: unknown,
  status = 200
): void {
  fetchMock
    .get(`https://api.cloudflare.com/client/v4${path}`)
    .intercept({ path })
    .reply(status, response);
}

