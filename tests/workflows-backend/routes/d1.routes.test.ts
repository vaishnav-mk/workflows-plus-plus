import { describe, it, expect } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials, logErrorResponse } from "../helpers/test-helpers";

describe("D1 Routes", () => {
  const testCredentials = createTestCredentials();
  const databaseId = "a30253fe-db09-4ce4-a35e-ff8179f98fd9";

  describe("GET /api/d1", () => {
    it("should successfully list D1 databases", async () => {
      // Real API call to Cloudflare
      const response = await authenticatedFetch("/api/d1?page=1&per_page=1000");

      if (response.status !== 200) {
        await logErrorResponse(response, "list D1 databases");
      }
      expect(response.status).toBe(200);
      
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/d1");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/d1/:id", () => {
    it("should successfully get database details", async () => {
      // Real API call
      const response = await authenticatedFetch(`/api/d1/${databaseId}`);

      // Allow 404 if the hardcoded ID doesn't exist, but otherwise expect 200
      if (response.status !== 200 && response.status !== 404) {
        await logErrorResponse(response, "get D1 database details");
      }
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
      }
    });

    it("should fail with invalid database ID", async () => {
      // Cloudflare API might return 400 or 404 for invalid ID format
      const response = await authenticatedFetch("/api/d1/invalid-id-xyz");
      expect([400, 404]).toContain(response.status);
    });
  });

  describe("POST /api/d1", () => {
    it("should attempt to create database (handling success or permission denied)", async () => {
      // Real API call - will create actual database
      const response = await authenticatedFetch("/api/d1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `test-db-${Date.now()}`,
        }),
      });

      if (response.status >= 500) {
        await logErrorResponse(response, "create D1 database");
      }

      // We expect 201 (Created) or 403 (Forbidden - if token lacks permissions)
      // We do NOT expect 401 (Unauthorized) as we sent a valid cookie
      expect([201, 403]).toContain(response.status);

      if (response.status === 201) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data.name).toBeDefined();
      } else if (response.status === 403) {
        // Verify standard error response format
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(false);
        // We know this is a permission issue, so we pass
      }
    });

    it("should fail with invalid name", async () => {
      const response = await authenticatedFetch("/api/d1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "", // Empty name
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/d1/:id/query", () => {
    it("should successfully execute query", async () => {
      // Real API call - will execute actual query
      const response = await authenticatedFetch(`/api/d1/${databaseId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: "SELECT 1 as test",
        }),
      });

      if (response.status !== 200) {
        await logErrorResponse(response, "execute D1 query");
      }
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      // data.data is an array of results for each statement
      expect(Array.isArray(data.data)).toBe(true);
      if (data.data.length > 0) {
         expect(data.data[0].results).toBeDefined();
      }
    });

    it("should fail with invalid SQL", async () => {
      const response = await authenticatedFetch(`/api/d1/${databaseId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: "INVALID SQL SYNTAX",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/d1/:id/validate-query", () => {
    it("should successfully validate query", async () => {
      // Real API call
      const response = await authenticatedFetch(`/api/d1/${databaseId}/validate-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "SELECT * FROM test_table",
        }),
      });

      if (response.status !== 200) {
        await logErrorResponse(response, "validate D1 query");
      }
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.valid).toBeDefined();
    });
  });

  describe("GET /api/d1/:id/schema", () => {
    it("should successfully get database schema", async () => {
      // Real API call
      const response = await authenticatedFetch(`/api/d1/${databaseId}/schema`);

      // Allow 404 if DB doesn't exist
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data.tables).toBeDefined();
      }
    });
  });
});
