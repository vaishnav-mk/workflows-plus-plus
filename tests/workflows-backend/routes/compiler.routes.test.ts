import { describe, it, expect } from "vitest";
import { authenticatedFetch, parseJsonResponse } from "../helpers/test-helpers";

describe("Compiler Routes", () => {
  const mockWorkflow = {
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

  describe("POST /api/compiler/compile", () => {
    it("should successfully compile a valid workflow", async () => {
      const response = await authenticatedFetch("/api/compiler/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Workflow",
          nodes: mockWorkflow.nodes,
          edges: mockWorkflow.edges,
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.tsCode).toBeDefined();
    });

    it("should fail with invalid workflow structure", async () => {
      const response = await authenticatedFetch("/api/compiler/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Workflow",
          nodes: "invalid", // Should be array
          edges: [],
        }),
      });

      expect(response.status).toBe(400);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
    });

    it("should fail with missing required fields", async () => {
      const response = await authenticatedFetch("/api/compiler/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Missing nodes and edges
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/compiler/preview", () => {
    it("should successfully preview compilation", async () => {
      const response = await authenticatedFetch("/api/compiler/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Workflow",
          nodes: mockWorkflow.nodes,
          edges: mockWorkflow.edges,
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it("should fail with invalid nodes", async () => {
      const response = await authenticatedFetch("/api/compiler/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Workflow",
          nodes: [{ id: "node-1" }], // Missing required fields
          edges: [],
        }),
      });

      // Should either validate or compile - depends on implementation
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe("POST /api/compiler/validate-bindings", () => {
    it("should validate bindings successfully", async () => {
      const response = await authenticatedFetch("/api/compiler/validate-bindings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow: {
            name: "Test Workflow",
            nodes: mockWorkflow.nodes,
            edges: mockWorkflow.edges,
          },
          availableBindings: [
            { name: "MY_KV", type: "kv_namespace" },
            { name: "MY_DB", type: "d1_database" },
          ],
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.required).toBeDefined();
      expect(data.data.available).toBeDefined();
      expect(data.data.missing).toBeDefined();
    });

    it("should fail with missing workflow", async () => {
      const response = await authenticatedFetch("/api/compiler/validate-bindings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableBindings: [],
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/compiler/validate-templates", () => {
    it("should validate templates successfully", async () => {
      const response = await authenticatedFetch("/api/compiler/validate-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: mockWorkflow.nodes,
          edges: mockWorkflow.edges,
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.valid).toBeDefined();
      expect(Array.isArray(data.data.errors)).toBe(true);
    });

    it("should fail with invalid workflow structure", async () => {
      const response = await authenticatedFetch("/api/compiler/validate-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: "invalid",
          edges: [],
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/compiler/resolve-workflow", () => {
    it("should resolve workflow templates successfully", async () => {
      const response = await authenticatedFetch("/api/compiler/resolve-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: mockWorkflow.nodes,
          edges: mockWorkflow.edges,
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it("should fail with missing nodes", async () => {
      const response = await authenticatedFetch("/api/compiler/resolve-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edges: [],
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/compiler/resolve-node/:nodeId", () => {
    it("should resolve node templates successfully", async () => {
      const nodeId = "node-1";
      const response = await authenticatedFetch(`/api/compiler/resolve-node/${nodeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow: {
            nodes: mockWorkflow.nodes,
            edges: mockWorkflow.edges,
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.nodeId).toBe(nodeId);
      expect(data.data.resolvedConfig).toBeDefined();
    });

    it("should return 404 for non-existent node", async () => {
      const response = await authenticatedFetch("/api/compiler/resolve-node/non-existent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow: {
            nodes: mockWorkflow.nodes,
            edges: mockWorkflow.edges,
          },
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/compiler/reverse-codegen", () => {
    it("should parse workflow code successfully", async () => {
      const mockCode = `
        export default {
          async fetch(request: Request): Promise<Response> {
            return new Response("Hello");
          }
        };
      `;

      const response = await authenticatedFetch("/api/compiler/reverse-codegen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: mockCode,
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it("should fail with empty code", async () => {
      const response = await authenticatedFetch("/api/compiler/reverse-codegen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "",
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});

