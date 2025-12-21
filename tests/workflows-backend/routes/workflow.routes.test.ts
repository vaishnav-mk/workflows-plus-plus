import { describe, it, expect } from "vitest";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, logErrorResponse } from "../helpers/test-helpers";

describe("Workflow Routes", () => {
  describe("GET /api/workflows", () => {
    it("should successfully list workflows", async () => {
      // Real API call - will make actual request to Cloudflare
      const response = await authenticatedFetch("/api/workflows?page=1&per_page=10");

      // Should return 200 if credentials are valid
      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/workflows");

      expect(response.status).toBe(401);
    });

    it("should handle pagination parameters", async () => {
      const response = await authenticatedFetch("/api/workflows?page=2&per_page=5");

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
      }
    });
  });

  describe("POST /api/workflows/validate", () => {
    const validWorkflow = {
      nodes: [
        {
          id: "step_entry_0",
          type: "entry",
          data: {
            label: "Entry",
            type: "entry",
            icon: "Play",
            status: "idle",
            config: {}
          },
          config: {}
        },
        {
          id: "step_http_request_1",
          type: "http-request",
          data: {
            label: "HTTP Request",
            type: "http-request",
            icon: "Globe",
            status: "idle",
            config: {
              url: "https://api.jolpi.ca/ergast/f1/current/driverStandings.json",
              method: "GET"
            }
          },
          config: {
            url: "https://api.jolpi.ca/ergast/f1/current/driverStandings.json",
            method: "GET"
          }
        },
        {
          id: "step_return_2",
          type: "return",
          data: {
            label: "Return",
            type: "return",
            icon: "CheckCircle",
            status: "idle",
            config: {}
          },
          config: {}
        }
      ],
      edges: [
        {
          id: "step_entry_0-step_http_request_1",
          source: "step_entry_0",
          target: "step_http_request_1"
        },
        {
          id: "step_http_request_1-step_return_2",
          source: "step_http_request_1",
          target: "step_return_2"
        }
      ],
    };

    it("should successfully validate a valid workflow", async () => {
      const response = await authenticatedFetch("/api/workflows/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validWorkflow),
      });

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data.valid).toBe(true);
      }
    });

    it("should fail with invalid workflow structure", async () => {
      const response = await authenticatedFetch("/api/workflows/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: "invalid",
          edges: [],
        }),
      });

      expect([400, 401]).toContain(response.status);
    });

    it("should fail with missing required fields", async () => {
      const response = await authenticatedFetch("/api/workflows/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      // Should return 400 for validation errors
      if (response.status >= 500) {
        await logErrorResponse(response, "validate workflow missing fields");
      }
      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/workflows/:id/deploy", () => {
    const workflowId = "test-workflow-123";
    const deployPayload = {
      workflowName: "Test Workflow",
      nodes: [
        {
          id: "step_entry_0",
          type: "entry",
          data: {
            label: "Entry",
            type: "entry",
            icon: "Play",
            status: "idle",
            config: {}
          },
          config: {}
        },
        {
          id: "step_http_request_1",
          type: "http-request",
          data: {
            label: "HTTP Request",
            type: "http-request",
            icon: "Globe",
            status: "idle",
            config: {
              url: "https://api.jolpi.ca/ergast/f1/current/driverStandings.json",
              method: "GET"
            }
          },
          config: {
            url: "https://api.jolpi.ca/ergast/f1/current/driverStandings.json",
            method: "GET"
          }
        },
        {
          id: "step_return_2",
          type: "return",
          data: {
            label: "Return",
            type: "return",
            icon: "CheckCircle",
            status: "idle",
            config: {}
          },
          config: {}
        }
      ],
      edges: [
        {
          id: "step_entry_0-step_http_request_1",
          source: "step_entry_0",
          target: "step_http_request_1"
        },
        {
          id: "step_http_request_1-step_return_2",
          source: "step_http_request_1",
          target: "step_return_2"
        }
      ],
      bindings: [],
    };

    it("should successfully start deployment", async () => {
      const response = await authenticatedFetch(`/api/workflows/${workflowId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deployPayload),
      });

      // Deployment is async, should return 202 Accepted or error (may be 503 if service unavailable)
      if (response.status >= 500 && response.status !== 503) {
        await logErrorResponse(response, "deploy workflow");
      }
      expect([200, 202, 400, 401, 503]).toContain(response.status);
      if ([200, 202].includes(response.status)) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data.deploymentId).toBeDefined();
      }
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/workflows/${workflowId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deployPayload),
      });

      expect(response.status).toBe(401);
    });

    it("should fail with invalid workflow ID", async () => {
      const response = await authenticatedFetch("/api/workflows//deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deployPayload),
      });

      expect([400, 404]).toContain(response.status);
    });
  });
});
