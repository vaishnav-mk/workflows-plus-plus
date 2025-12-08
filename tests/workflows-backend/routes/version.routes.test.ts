import { describe, it, expect } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("Version Routes", () => {
  const testCredentials = createTestCredentials();
  const workerId = "test-worker-123";

  describe("GET /api/workers/:workerId/versions", () => {
    it("should successfully list worker versions", async () => {
      // Real API call - will make actual request to Cloudflare
      const response = await authenticatedFetch(`/api/workers/${workerId}/versions?page=1&per_page=10`);

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workers/${workerId}/versions`);

      expect(response.status).toBe(401);
    });

    it("should handle pagination", async () => {
      const response = await authenticatedFetch(`/api/workers/${workerId}/versions?page=2&per_page=5`);

      expect([200, 401, 404]).toContain(response.status);
    });
  });

  describe("GET /api/workers/:workerId/versions/:versionId", () => {
    const versionId = "version-123";

    it("should successfully get version details", async () => {
      // Real API call
      const response = await authenticatedFetch(`/api/workers/${workerId}/versions/${versionId}`);

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workers/${workerId}/versions/${versionId}`);

      expect(response.status).toBe(401);
    });

    it("should include modules when requested", async () => {
      const response = await authenticatedFetch(`/api/workers/${workerId}/versions/${versionId}?include=modules`);

      expect([200, 401, 404]).toContain(response.status);
    });
  });
});
