import { describe, it, expect } from "vitest";
import { unauthenticatedFetch, parseJsonResponse } from "../helpers/test-helpers";

describe("Starters Routes", () => {
  describe("GET /api/starters", () => {
    it("should successfully list all starters", async () => {
      const response = await unauthenticatedFetch("/api/starters");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should filter starters by category", async () => {
      const response = await unauthenticatedFetch("/api/starters?category=api");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should filter starters by difficulty", async () => {
      const response = await unauthenticatedFetch("/api/starters?difficulty=beginner");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
    });

    it("should filter starters by tags", async () => {
      const response = await unauthenticatedFetch("/api/starters?tags=http,api");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
    });
  });

  describe("GET /api/starters/categories", () => {
    it("should successfully list all categories", async () => {
      const response = await unauthenticatedFetch("/api/starters/categories");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe("GET /api/starters/:id", () => {
    it("should successfully get starter by ID", async () => {
      // First get list to find a valid ID
      const listResponse = await unauthenticatedFetch("/api/starters");
      const listData = await parseJsonResponse(listResponse);
      
      if (Array.isArray(listData.data) && listData.data.length > 0) {
        const starterId = listData.data[0].id;
        const response = await unauthenticatedFetch(`/api/starters/${starterId}`);

        expect(response.status).toBe(200);
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(starterId);
      }
    });

    it("should return 404 for non-existent starter", async () => {
      const response = await unauthenticatedFetch("/api/starters/non-existent-id-xyz");

      expect(response.status).toBe(404);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });
  });
});

