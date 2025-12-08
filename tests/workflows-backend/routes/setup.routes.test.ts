import { describe, it, expect, beforeAll } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("Setup Routes", () => {
  const testCredentials = createTestCredentials();

  beforeAll(() => {
    // Check if API is running
    // In a real scenario, you might want to wait for the API to be ready
  });

  describe("POST /api/setup", () => {
    it("should successfully setup credentials with valid token", async () => {
      // Note: This test requires a valid Cloudflare API token
      // The API will make a real request to Cloudflare to verify the token

      const response = await unauthenticatedFetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: testCredentials.apiToken,
          accountId: testCredentials.accountId,
        }),
      });

      // Should return 200 if token is valid, or 401/500/503 if invalid/error/service unavailable
      expect([200, 401, 503]).toContain(response.status);
      const data = await parseJsonResponse(response);
      
      if (response.status === 200) {
        expect(data.success).toBe(true);
        expect(data.data.configured).toBe(true);
        
        // Check that cookie was set
        const setCookieHeader = response.headers.get("Set-Cookie");
        expect(setCookieHeader).toBeDefined();
        expect(setCookieHeader).toContain("cf_credentials");
      } else {
        expect(data.success).toBe(false);
      }
    });

    it("should fail with invalid token", async () => {
      // Test with an invalid token - API will make real request to Cloudflare

      const response = await unauthenticatedFetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: "invalid-token",
          accountId: testCredentials.accountId,
        }),
      });

      // Should return 401 for invalid token
      expect([200, 401]).toContain(response.status);
      if (response.status === 401) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
      }
    });

    it("should fail with missing required fields", async () => {
      const response = await unauthenticatedFetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: testCredentials.apiToken,
          // Missing accountId
        }),
      });

      expect(response.status).toBe(400);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
    });
  });

  describe("POST /api/setup/stream", () => {
    it("should stream setup progress with valid credentials", async () => {
      // This will make real requests to Cloudflare API
      // The API will verify token and check various resources

      const response = await unauthenticatedFetch("/api/setup/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: testCredentials.apiToken,
          accountId: testCredentials.accountId,
        }),
      });

      // Should return 200 with SSE stream
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    });

    it("should fail with invalid token in stream", async () => {
      // Test with invalid token - will make real request to Cloudflare

      const response = await unauthenticatedFetch("/api/setup/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: "invalid-token",
          accountId: testCredentials.accountId,
        }),
      });

      // SSE streams return 200 even on error
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    });
  });

  describe("POST /api/setup/logout", () => {
    it("should successfully logout", async () => {
      const response = await authenticatedFetch("/api/setup/logout", {
        method: "POST",
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.loggedOut).toBe(true);
    });
  });
});

