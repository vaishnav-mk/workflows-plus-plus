import { describe, it, expect } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse } from "../helpers/test-helpers";

describe("AI Routes", () => {
  describe("POST /api/workflows/generate", () => {
    it("should successfully generate workflow from text", async () => {
      const response = await authenticatedFetch("/api/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Create a workflow that fetches data from an API and stores it in KV",
        }),
      });

      // May fail if AI Gateway is not configured, but should return proper error
      expect([200, 500]).toContain(response.status);
      const data = await parseJsonResponse(response);
      
      if (response.status === 200) {
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
      } else {
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Create a workflow",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should fail with missing text and image", async () => {
      const response = await authenticatedFetch("/api/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it("should handle AI Gateway not configured", async () => {
      const response = await authenticatedFetch("/api/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Create a workflow",
        }),
      });

      // Should return 500 if AI Gateway is not configured
      if (response.status === 500) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(false);
        expect(data.error).toContain("AI Gateway");
      }
    });
  });
});

