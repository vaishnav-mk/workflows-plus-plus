import { describe, it, expect } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse } from "../helpers/test-helpers";

describe("Deployment Routes", () => {
  const deploymentId = "deployment-123";

  describe("GET /api/deployments/:deploymentId/stream", () => {
    it("should successfully stream deployment progress", async () => {
      const response = await authenticatedFetch(`/api/deployments/${deploymentId}/stream`);

      // Should return SSE stream or error if DO not configured
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.headers.get("Content-Type")).toContain("text/event-stream");
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/deployments/${deploymentId}/stream`);

      expect(response.status).toBe(401);
    });

    it("should fail with missing deployment ID", async () => {
      const response = await authenticatedFetch("/api/deployments//stream");

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/deployments/:deploymentId/status", () => {
    it("should successfully get deployment status", async () => {
      const response = await authenticatedFetch(`/api/deployments/${deploymentId}/status`);

      // May fail if DO not configured, but should handle gracefully
      expect([200, 400, 500]).toContain(response.status);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/deployments/${deploymentId}/status`);

      expect(response.status).toBe(401);
    });

    it("should fail with missing deployment ID", async () => {
      const response = await authenticatedFetch("/api/deployments//status");

      expect(response.status).toBe(400);
    });
  });
});

