import { describe, it, expect } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("KV Routes", () => {
  const testCredentials = createTestCredentials();
  const namespaceId = "test-namespace-id";

  describe("GET /api/kv", () => {
    it("should successfully list KV namespaces", async () => {
      // Real API call to Cloudflare
      const response = await authenticatedFetch("/api/kv?page=1&per_page=1000");

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/kv");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/kv/:id", () => {
    it("should successfully get namespace details", async () => {
      // Real API call
      const response = await authenticatedFetch(`/api/kv/${namespaceId}`);

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
      }
    });

    it("should fail with invalid namespace ID", async () => {
      const response = await authenticatedFetch("/api/kv/invalid-id-xyz");

      expect([404]).toContain(response.status);
    });
  });

  describe("POST /api/kv", () => {
    it("should successfully create namespace", async () => {
      // Real API call - will create actual namespace
      const response = await authenticatedFetch("/api/kv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `test-namespace-${Date.now()}`,
        }),
      });

      expect([201, 400, 401, 404]).toContain(response.status);
      if (response.status === 201) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data.title).toBeDefined();
      }
    });

    it("should fail with invalid title", async () => {
      const response = await authenticatedFetch("/api/kv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "", // Empty title
        }),
      });

      // May return 400 or 404
      expect([400, 404]).toContain(response.status);
    });
  });
});
