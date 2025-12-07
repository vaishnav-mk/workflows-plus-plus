import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { fetchMock } from "cloudflare:test";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("Workflow Routes", () => {
  const testCredentials = createTestCredentials();

  beforeAll(() => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.assertNoPendingInterceptors();
  });

  describe("GET /api/workflows", () => {
    it("should successfully list workflows", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workflows`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workflows` })
        .reply(200, {
          result: [
            { id: "workflow-1", name: "Test Workflow" },
            { id: "workflow-2", name: "Another Workflow" },
          ],
          result_info: { total_count: 2 },
        });

      const response = await authenticatedFetch("/api/workflows?page=1&per_page=10");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/workflows");

      expect(response.status).toBe(401);
    });

    it("should handle pagination parameters", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/workflows`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/workflows` })
        .reply(200, { result: [], result_info: { total_count: 0 } });

      const response = await authenticatedFetch("/api/workflows?page=2&per_page=5");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
    });
  });

  describe("POST /api/workflows/validate", () => {
    const validWorkflow = {
      nodes: [
        {
          id: "node-1",
          type: "http-request",
          position: { x: 0, y: 0 },
          config: { url: "https://example.com" },
        },
      ],
      edges: [],
    };

    it("should successfully validate a valid workflow", async () => {
      const response = await authenticatedFetch("/api/workflows/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validWorkflow),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.valid).toBe(true);
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

      expect(response.status).toBe(400);
    });

    it("should fail with missing required fields", async () => {
      const response = await authenticatedFetch("/api/workflows/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/workflows/:id/deploy", () => {
    const workflowId = "test-workflow-123";
    const deployPayload = {
      workflowName: "Test Workflow",
      nodes: [
        {
          id: "node-1",
          type: "http-request",
          position: { x: 0, y: 0 },
          config: { url: "https://example.com" },
        },
      ],
      edges: [],
      bindings: [],
    };

    it("should successfully start deployment", async () => {
      const response = await authenticatedFetch(`/api/workflows/${workflowId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deployPayload),
      });

      // Deployment is async, should return 202 Accepted
      expect([200, 202]).toContain(response.status);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.deploymentId).toBeDefined();
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

      expect(response.status).toBe(400);
    });
  });
});

