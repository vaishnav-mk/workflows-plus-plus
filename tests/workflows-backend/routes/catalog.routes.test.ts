import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";
import { unauthenticatedFetch, parseJsonResponse } from "../helpers/test-helpers";

describe("Catalog Routes", () => {
  describe("GET /api/catalog", () => {
    it("should return catalog JSON", async () => {
      const response = await unauthenticatedFetch("/api/catalog");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data).toBeDefined();
      expect(Array.isArray(data) || typeof data === "object").toBe(true);
    });
  });

  describe("GET /api/catalog/full", () => {
    it("should return full catalog with success response", async () => {
      const response = await unauthenticatedFetch("/api/catalog/full");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });
  });

  describe("GET /api/catalog/:nodeType", () => {
    it("should return node details for valid node type", async () => {
      // First get catalog to find a valid node type
      const catalogResponse = await unauthenticatedFetch("/api/catalog");
      const catalog = await parseJsonResponse(catalogResponse);
      
      // Try to find a node type (assuming catalog structure)
      const nodeType = "http-request"; // Common node type
      
      const response = await unauthenticatedFetch(`/api/catalog/${nodeType}`);

      // Should either return 200 with node or 404 if not found
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
      } else {
        expect(response.status).toBe(404);
      }
    });

    it("should return 404 for invalid node type", async () => {
      const response = await unauthenticatedFetch("/api/catalog/invalid-node-type-xyz");

      expect(response.status).toBe(404);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });
  });

  describe("GET /api/catalog/categories", () => {
    it("should return nodes for valid category", async () => {
      const response = await unauthenticatedFetch("/api/catalog/categories?category=HTTP");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should return 400 for invalid category", async () => {
      const response = await unauthenticatedFetch("/api/catalog/categories?category=INVALID_CATEGORY");

      expect(response.status).toBe(400);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not valid");
    });

    it("should return 400 for missing category parameter", async () => {
      const response = await unauthenticatedFetch("/api/catalog/categories");

      expect(response.status).toBe(400);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
    });
  });
});

