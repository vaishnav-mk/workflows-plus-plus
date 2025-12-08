import { describe, it, expect } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, logErrorResponse } from "../helpers/test-helpers";

describe("AI Routes", () => {
  describe("POST /api/workflows/generate", () => {
    // In the local environment without AI Gateway config, this should consistently return 503
    it("should return 503 when AI Gateway is not configured", async () => {
      const response = await authenticatedFetch("/api/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Create a workflow that fetches data from an API and stores it in KV",
        }),
      });

      // Strict check for 503 Service Unavailable
      expect(response.status).toBe(503);
      
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
      expect(data.error).toBe("INTERNAL_ERROR"); // or whatever code we mapped
      expect(data.message).toContain("AI Gateway not configured");
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

      // Strict check for validation error (400)
      if (response.status !== 400) {
        await logErrorResponse(response, "AI generate missing fields");
      }
      expect(response.status).toBe(400);
    });
  });
});
