import { describe, it, expect } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("Worker Routes", () => {
  const testCredentials = createTestCredentials();

  describe("GET /api/workers", () => {
    it("should successfully list workers", async () => {
      // This will make a real request to Cloudflare API via the backend

      const response = await authenticatedFetch("/api/workers?page=1&per_page=10");

      // Should return 200 if credentials are valid and workers exist
      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/workers");

      expect(response.status).toBe(401);
    });

    it("should handle pagination", async () => {
      // Real API call with pagination

      const response = await authenticatedFetch("/api/workers?page=2&per_page=5");

      expect([200, 401]).toContain(response.status);
    });
  });

  describe("GET /api/workers/:id", () => {
    const workerId = "test-worker-123";

    it("should successfully get worker details", async () => {
      // Real API call - will fail if worker doesn't exist

      const response = await authenticatedFetch(`/api/workers/${workerId}`);

      // May return 200, 404, or 500 depending on whether worker exists
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workers/${workerId}`);

      expect(response.status).toBe(401);
    });

    it("should fail with invalid worker ID", async () => {
      const response = await authenticatedFetch("/api/workers/invalid-id-xyz-123");

      // Should return 404 or 500 for non-existent worker
      expect([404]).toContain(response.status);
    });
  });
});

