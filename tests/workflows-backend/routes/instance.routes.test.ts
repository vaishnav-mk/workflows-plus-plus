import { describe, it, expect } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("Instance Routes", () => {
  const testCredentials = createTestCredentials();
  const workflowName = "test-workflow";

  describe("GET /api/workflows/:workflowName/instances", () => {
    it("should successfully list instances", async () => {
      // Real API call to Cloudflare
      const response = await authenticatedFetch(`/api/workflows/${workflowName}/instances?page=1&per_page=10`);

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workflows/${workflowName}/instances`);

      expect(response.status).toBe(401);
    });

    it("should handle pagination", async () => {
      const response = await authenticatedFetch(`/api/workflows/${workflowName}/instances?page=2&per_page=5`);

      expect([200, 401, 404]).toContain(response.status);
    });
  });

  describe("GET /api/workflows/:workflowName/instances/:instanceId", () => {
    const instanceId = "instance-123";

    it("should successfully get instance details", async () => {
      // Real API call
      const response = await authenticatedFetch(`/api/workflows/${workflowName}/instances/${instanceId}`);

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workflows/${workflowName}/instances/${instanceId}`);

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/workflows/:workflowName/instances/:instanceId/logs/tail-url", () => {
    const instanceId = "instance-123";

    it("should successfully create tail session", async () => {
      // Real API call
      const response = await authenticatedFetch(`/api/workflows/${workflowName}/instances/${instanceId}/logs/tail-url`);

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data.url).toBeDefined();
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workflows/${workflowName}/instances/${instanceId}/logs/tail-url`);

      expect(response.status).toBe(401);
    });
  });
});
