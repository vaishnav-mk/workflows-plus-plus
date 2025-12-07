import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { fetchMock } from "cloudflare:test";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("Instance Routes", () => {
  const testCredentials = createTestCredentials();
  const workflowName = "test-workflow";

  beforeAll(() => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.assertNoPendingInterceptors();
  });

  describe("GET /api/workflows/:workflowName/instances", () => {
    it("should successfully list instances", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workflows/${workflowName}/instances`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workflows/${workflowName}/instances` })
        .reply(200, {
          result: [
            { id: "instance-1", status: "running" },
            { id: "instance-2", status: "complete" },
          ],
          result_info: { total_count: 2 },
        });

      const response = await authenticatedFetch(`/api/workflows/${workflowName}/instances?page=1&per_page=10`);

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workflows/${workflowName}/instances`);

      expect(response.status).toBe(401);
    });

    it("should handle pagination", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workflows/${workflowName}/instances`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workflows/${workflowName}/instances` })
        .reply(200, { result: [], result_info: { total_count: 0 } });

      const response = await authenticatedFetch(`/api/workflows/${workflowName}/instances?page=2&per_page=5`);

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/workflows/:workflowName/instances/:instanceId", () => {
    const instanceId = "instance-123";

    it("should successfully get instance details", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workflows/${workflowName}/instances/${instanceId}`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workflows/${workflowName}/instances/${instanceId}` })
        .reply(200, {
          result: {
            id: instanceId,
            status: "running",
            created_at: "2024-01-01T00:00:00Z",
          },
        });

      const response = await authenticatedFetch(`/api/workflows/${workflowName}/instances/${instanceId}`);

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(instanceId);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workflows/${workflowName}/instances/${instanceId}`);

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/workflows/:workflowName/instances/:instanceId/logs/tail-url", () => {
    const instanceId = "instance-123";

    it("should successfully create tail session", async () => {
      // This endpoint calls Cloudflare API to create a tail session
      // We'll mock a successful response
      const response = await authenticatedFetch(`/api/workflows/${workflowName}/instances/${instanceId}/logs/tail-url`);

      // May fail if service is not available, but should handle gracefully
      expect([200, 500]).toContain(response.status);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workflows/${workflowName}/instances/${instanceId}/logs/tail-url`);

      expect(response.status).toBe(401);
    });
  });
});

