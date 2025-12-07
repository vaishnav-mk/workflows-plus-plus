import { describe, it, expect } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse } from "../helpers/test-helpers";

describe("Node Execution Routes", () => {
  describe("POST /api/nodes/execute", () => {
    it("should successfully execute a node", async () => {
      const response = await authenticatedFetch("/api/nodes/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "http-request",
          config: {
            url: "https://example.com",
            method: "GET",
          },
          inputData: {},
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBeDefined();
      expect(data.data).toBeDefined();
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/nodes/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "http-request",
          config: {},
          inputData: {},
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should fail with missing required fields", async () => {
      const response = await authenticatedFetch("/api/nodes/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Missing type
          config: {},
          inputData: {},
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should fail with invalid node type", async () => {
      const response = await authenticatedFetch("/api/nodes/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "invalid-node-type",
          config: {},
          inputData: {},
        }),
      });

      // Should either return 200 with error or 404/500
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("POST /api/nodes/validate", () => {
    it("should successfully validate node configuration", async () => {
      const response = await authenticatedFetch("/api/nodes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "http-request",
          config: {
            url: "https://example.com",
            method: "GET",
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.valid).toBeDefined();
      expect(Array.isArray(data.data.errors)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/nodes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "http-request",
          config: {},
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should fail with missing node type", async () => {
      const response = await authenticatedFetch("/api/nodes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {},
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should return validation errors for invalid config", async () => {
      const response = await authenticatedFetch("/api/nodes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "http-request",
          config: {
            // Missing required url field
            method: "GET",
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      // Should have validation errors
      expect(data.data.valid === false || data.data.errors.length > 0).toBe(true);
    });
  });
});

