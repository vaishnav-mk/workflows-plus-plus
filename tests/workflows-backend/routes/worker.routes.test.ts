import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { fetchMock } from "cloudflare:test";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("Worker Routes", () => {
  const testCredentials = createTestCredentials();

  beforeAll(() => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.assertNoPendingInterceptors();
  });

  describe("GET /api/workers", () => {
    it("should successfully list workers", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workers/workers`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workers/workers` })
        .reply(200, {
          result: [
            { id: "worker-1", name: "Test Worker" },
            { id: "worker-2", name: "Another Worker" },
          ],
          result_info: { total_count: 2 },
        });

      const response = await authenticatedFetch("/api/workers?page=1&per_page=10");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/workers");

      expect(response.status).toBe(401);
    });

    it("should handle pagination", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workers/workers`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workers/workers` })
        .reply(200, { result: [], result_info: { total_count: 0 } });

      const response = await authenticatedFetch("/api/workers?page=2&per_page=5");

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/workers/:id", () => {
    const workerId = "test-worker-123";

    it("should successfully get worker details", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workers/workers/${workerId}`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workers/workers/${workerId}` })
        .reply(200, {
          result: {
            id: workerId,
            name: "Test Worker",
            created_on: "2024-01-01T00:00:00Z",
          },
        });

      const response = await authenticatedFetch(`/api/workers/${workerId}`);

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(workerId);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workers/${workerId}`);

      expect(response.status).toBe(401);
    });

    it("should fail with invalid worker ID", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workers/workers/invalid-id`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workers/workers/invalid-id` })
        .reply(404, { success: false, errors: [{ message: "Worker not found" }] });

      const response = await authenticatedFetch("/api/workers/invalid-id");

      expect(response.status).toBe(500); // API error gets converted to 500
    });
  });
});

