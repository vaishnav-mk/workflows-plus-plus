import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { fetchMock } from "cloudflare:test";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("Version Routes", () => {
  const testCredentials = createTestCredentials();
  const workerId = "test-worker-123";

  beforeAll(() => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.assertNoPendingInterceptors();
  });

  describe("GET /api/workers/:workerId/versions", () => {
    it("should successfully list worker versions", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workers/workers/${workerId}/versions`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workers/workers/${workerId}/versions` })
        .reply(200, {
          result: [
            { id: "version-1", version: "1.0.0" },
            { id: "version-2", version: "2.0.0" },
          ],
          result_info: { total_count: 2 },
        });

      const response = await authenticatedFetch(`/api/workers/${workerId}/versions?page=1&per_page=10`);

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workers/${workerId}/versions`);

      expect(response.status).toBe(401);
    });

    it("should handle pagination", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workers/workers/${workerId}/versions`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workers/workers/${workerId}/versions` })
        .reply(200, { result: [], result_info: { total_count: 0 } });

      const response = await authenticatedFetch(`/api/workers/${workerId}/versions?page=2&per_page=5`);

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/workers/:workerId/versions/:versionId", () => {
    const versionId = "version-123";

    it("should successfully get version details", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workers/workers/${workerId}/versions/${versionId}`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workers/workers/${workerId}/versions/${versionId}` })
        .reply(200, {
          result: {
            id: versionId,
            version: "1.0.0",
            created_on: "2024-01-01T00:00:00Z",
          },
        });

      const response = await authenticatedFetch(`/api/workers/${workerId}/versions/${versionId}`);

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(versionId);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workers/${workerId}/versions/${versionId}`);

      expect(response.status).toBe(401);
    });

    it("should include modules when requested", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workers/workers/${workerId}/versions/${versionId}`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workers/workers/${workerId}/versions/${versionId}` })
        .reply(200, {
          result: {
            id: versionId,
            version: "1.0.0",
            modules: [],
          },
        });

      const response = await authenticatedFetch(`/api/workers/${workerId}/versions/${versionId}?include=modules`);

      expect(response.status).toBe(200);
    });
  });
});

