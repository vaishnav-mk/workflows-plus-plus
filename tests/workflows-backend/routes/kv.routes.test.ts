import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { fetchMock } from "cloudflare:test";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("KV Routes", () => {
  const testCredentials = createTestCredentials();
  const namespaceId = "test-namespace-id";

  beforeAll(() => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.assertNoPendingInterceptors();
  });

  describe("GET /api/kv", () => {
    it("should successfully list KV namespaces", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/storage/kv/namespaces`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/storage/kv/namespaces` })
        .reply(200, {
          result: [
            { id: namespaceId, title: "Test Namespace" },
          ],
          result_info: { total_count: 1 },
        });

      const response = await authenticatedFetch("/api/kv?page=1&per_page=1000");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/kv");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/kv/:id", () => {
    it("should successfully get namespace details", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/storage/kv/namespaces/${namespaceId}`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/storage/kv/namespaces/${namespaceId}` })
        .reply(200, {
          result: {
            id: namespaceId,
            title: "Test Namespace",
          },
        });

      const response = await authenticatedFetch(`/api/kv/${namespaceId}`);

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(namespaceId);
    });

    it("should fail with invalid namespace ID", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/storage/kv/namespaces/invalid-id`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/storage/kv/namespaces/invalid-id` })
        .reply(404, { success: false, errors: [{ message: "Namespace not found" }] });

      const response = await authenticatedFetch("/api/kv/invalid-id");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/kv", () => {
    it("should successfully create namespace", async () => {
      fetchMock
        .post(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/storage/kv/namespaces`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/storage/kv/namespaces` })
        .reply(200, {
          result: {
            id: "new-namespace-id",
            title: "New Namespace",
          },
        });

      const response = await authenticatedFetch("/api/kv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Namespace",
        }),
      });

      expect(response.status).toBe(201);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe("New Namespace");
    });

    it("should fail with invalid title", async () => {
      const response = await authenticatedFetch("/api/kv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "", // Empty title
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});

