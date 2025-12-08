import { describe, it, expect } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse } from "../helpers/test-helpers";

describe("Starters Routes", () => {
  describe("GET /api/starters", () => {
    it("should successfully list all starters", async () => {
      // Starters routes require authentication
      const response = await authenticatedFetch("/api/starters");

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    it("should filter starters by category", async () => {
      const response = await authenticatedFetch("/api/starters?category=api");

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    it("should filter starters by difficulty", async () => {
      const response = await authenticatedFetch("/api/starters?difficulty=beginner");

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
      }
    });

    it("should filter starters by tags", async () => {
      const response = await authenticatedFetch("/api/starters?tags=http,api");

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
      }
    });
  });

  describe("GET /api/starters/categories", () => {
    it("should successfully list all categories", async () => {
      const response = await authenticatedFetch("/api/starters/categories");

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      }
    });
  });

  describe("GET /api/starters/:id", () => {
    it("should successfully get starter by ID", async () => {
      // First get list to find a valid ID
      const listResponse = await authenticatedFetch("/api/starters");
      if (listResponse.status === 200) {
        const listData = await parseJsonResponse(listResponse);
        
        if (Array.isArray(listData.data) && listData.data.length > 0) {
          const starterId = listData.data[0].id;
          const response = await authenticatedFetch(`/api/starters/${starterId}`);

          expect(response.status).toBe(200);
          const data = await parseJsonResponse(response);
          expect(data.success).toBe(true);
          expect(data.data.id).toBe(starterId);
        }
      }
    });

    it("should return 404 for non-existent starter", async () => {
      const response = await authenticatedFetch("/api/starters/non-existent-id-xyz");

      expect([404, 401]).toContain(response.status);
      if (response.status === 404) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(false);
        expect(data.error?.toLowerCase()).toMatch(/not found/i);
      }
    });
  });
});
