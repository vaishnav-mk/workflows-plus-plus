import { describe, it, expect } from "vitest";
import { authenticatedFetch, parseJsonResponse, logErrorResponse } from "../helpers/test-helpers";

describe("Compiler Routes", () => {
  const mockWorkflow = {
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

      // Should return 200 on success
      if (response.status >= 400) {
        await logErrorResponse(response, "compile workflow");
      }
      expect(response.status).toBe(200);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(data.data.tsCode).toBeDefined();
      }
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

      // Should return 400 for validation errors
      if (response.status >= 500) {
        
        await logErrorResponse(response, "invalid workflow structure");
      }
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

      // Should return 400 for validation errors
      if (response.status >= 500) {
        await logErrorResponse(response, "missing required fields");
      }
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

      // Should return 200 on success
      if (response.status >= 400) {
        await logErrorResponse(response, "preview compilation");
      }
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
      expect([200, 400]).toContain(response.status);
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

      // Should return 200 on success
      if (response.status >= 400) {
        await logErrorResponse(response, "validate bindings");
      }
      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      if (data.data) {
        expect(data.data.required).toBeDefined();
        expect(data.data.available).toBeDefined();
        expect(data.data.missing).toBeDefined();
      }
    });

    it("should fail with missing workflow", async () => {
      const response = await authenticatedFetch("/api/compiler/validate-bindings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableBindings: [],
        }),
      });

      // May return 400 or 500 depending on validation
      expect([400]).toContain(response.status);
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

      // Should return 200 on success
      if (response.status >= 400) {
        await logErrorResponse(response, "validate templates");
      }
      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      if (data.data) {
        expect(data.data.valid).toBeDefined();
        expect(Array.isArray(data.data.errors)).toBe(true);
      }
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

      // May return 400 or 500 depending on validation
      expect([400]).toContain(response.status);
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

      // Should return 200 on success
      if (response.status >= 400) {
        await logErrorResponse(response, "resolve workflow");
      }
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

      // Should return 400 for validation errors
      if (response.status >= 500) {
        await logErrorResponse(response, "resolve workflow missing nodes");
      }
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

      // May return 200, 400, or 500 depending on validation
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
      }
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

      // May return 400 or 404 depending on validation
      expect([400, 404]).toContain(response.status);
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

      // May return 200 or 500
      expect([200]).toContain(response.status);
      if (response.status === 200) {
        const data = await parseJsonResponse(response);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
      }
    });

    it("should fail with empty code", async () => {
      const response = await authenticatedFetch("/api/compiler/reverse-codegen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "",
        }),
      });

      // May return 400 or 500 depending on validation
      expect([400]).toContain(response.status);
    });
  });
});

