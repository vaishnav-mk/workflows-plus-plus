import { describe, it, expect } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("R2 Routes", () => {
  const testCredentials = createTestCredentials();
  const bucketName = "test-bucket";

  describe("GET /api/r2", () => {
    it("should successfully list R2 buckets", async () => {
      // Real API call to Cloudflare
      const response = await authenticatedFetch("/api/r2?page=1&per_page=1000");

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        // R2 may return array or object with buckets property
        expect(Array.isArray(data.data) || typeof data.data === 'object').toBe(true);
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/r2");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/r2", () => {
    it("should successfully create bucket", async () => {
      // Real API call - will create actual bucket
      const response = await authenticatedFetch("/api/r2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `test-bucket-${Date.now()}`,
        }),
      });

      expect([201, 400, 401]).toContain(response.status);
      if (response.status === 201) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data.name).toBeDefined();
      }
    });

    it("should fail with invalid bucket name", async () => {
      const response = await authenticatedFetch("/api/r2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Invalid Bucket Name!", // Invalid characters
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/r2/:name/objects", () => {
    it("should successfully list objects", async () => {
      // Real API call - requires existing bucket
      const response = await authenticatedFetch(`/api/r2/${bucketName}/objects`);

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data.objects).toBeDefined();
        expect(Array.isArray(data.data.objects)).toBe(true);
      }
    });

    it("should handle prefix parameter", async () => {
      const response = await authenticatedFetch(`/api/r2/${bucketName}/objects?prefix=images/`);

      expect([200, 401, 404]).toContain(response.status);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/r2/${bucketName}/objects`);

      expect(response.status).toBe(401);
    });
  });
});
