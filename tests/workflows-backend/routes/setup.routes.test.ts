import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { SELF, fetchMock } from "cloudflare:test";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("Setup Routes", () => {
  const testCredentials = createTestCredentials();

  beforeAll(() => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.assertNoPendingInterceptors();
  });

  describe("POST /api/setup", () => {
    it("should successfully setup credentials with valid token", async () => {
      // Mock Cloudflare API token verification with actual credentials
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/tokens/verify`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/tokens/verify` })
        .reply(200, { success: true });

      const response = await unauthenticatedFetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: testCredentials.apiToken,
          accountId: testCredentials.accountId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.configured).toBe(true);
      
      // Check that cookie was set
      const setCookieHeader = response.headers.get("Set-Cookie");
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader).toContain("cf_credentials");
    });

    it("should fail with invalid token", async () => {
      // Mock Cloudflare API token verification failure
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/tokens/verify`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/tokens/verify` })
        .reply(401, { success: false, errors: [{ message: "Invalid token" }] });

      const response = await unauthenticatedFetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: "invalid-token",
          accountId: testCredentials.accountId,
        }),
      });

      expect(response.status).toBe(401);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid credentials");
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
      // Mock all Cloudflare API calls with actual account ID
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/tokens/verify`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/tokens/verify` })
        .reply(200, { success: true });

      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/d1/database`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/d1/database` })
        .reply(200, { result: [], result_info: { total_count: 0 } });

      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/storage/kv/namespaces`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/storage/kv/namespaces` })
        .reply(200, { result: [], result_info: { total_count: 0 } });

      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workflows`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workflows` })
        .reply(200, { result: [], result_info: { total_count: 0 } });

      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workers/workers`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workers/workers` })
        .reply(200, { result: [], result_info: { total_count: 0 } });

      const response = await unauthenticatedFetch("/api/setup/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: testCredentials.apiToken,
          accountId: testCredentials.accountId,
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    });

    it("should fail with invalid token in stream", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/tokens/verify`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/tokens/verify` })
        .reply(401, { success: false });

      const response = await unauthenticatedFetch("/api/setup/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: "invalid-token",
          accountId: testCredentials.accountId,
        }),
      });

      expect(response.status).toBe(200); // SSE streams return 200 even on error
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

