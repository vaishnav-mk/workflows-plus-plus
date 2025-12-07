import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { fetchMock } from "cloudflare:test";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("D1 Routes", () => {
  const testCredentials = createTestCredentials();
  const databaseId = "a30253fe-db09-4ce4-a35e-ff8179f98fd9";

  beforeAll(() => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.assertNoPendingInterceptors();
  });

  describe("GET /api/d1", () => {
    it("should successfully list D1 databases", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/d1/database`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/d1/database` })
        .reply(200, {
          result: [
            { uuid: databaseId, name: "test-db" },
          ],
          result_info: { total_count: 1 },
        });

      const response = await authenticatedFetch("/api/d1?page=1&per_page=1000");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/d1");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/d1/:id", () => {
    it("should successfully get database details", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/d1/database/${databaseId}`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/d1/database/${databaseId}` })
        .reply(200, {
          result: {
            uuid: databaseId,
            name: "test-db",
          },
        });

      const response = await authenticatedFetch(`/api/d1/${databaseId}`);

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.uuid).toBe(databaseId);
    });

    it("should fail with invalid database ID", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/d1/database/invalid-id`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/d1/database/invalid-id` })
        .reply(404, { success: false, errors: [{ message: "Database not found" }] });

      const response = await authenticatedFetch("/api/d1/invalid-id");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/d1", () => {
    it("should successfully create database", async () => {
      fetchMock
        .post(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/d1/database`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/d1/database` })
        .reply(200, {
          result: {
            uuid: databaseId,
            name: "new-database",
          },
        });

      const response = await authenticatedFetch("/api/d1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "new-database",
        }),
      });

      expect(response.status).toBe(201);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("new-database");
    });

    it("should fail with invalid name", async () => {
      const response = await authenticatedFetch("/api/d1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "", // Empty name
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/d1/:id/query", () => {
    it("should successfully execute query", async () => {
      fetchMock
        .post(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/d1/database/${databaseId}/query`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/d1/database/${databaseId}/query` })
        .reply(200, {
          result: {
            results: [{ id: 1, name: "test" }],
            meta: { changes: 0 },
          },
          success: true,
        });

      const response = await authenticatedFetch(`/api/d1/${databaseId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: "SELECT * FROM test_table",
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.results).toBeDefined();
    });

    it("should fail with invalid SQL", async () => {
      fetchMock
        .post(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/d1/database/${databaseId}/query`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/d1/database/${databaseId}/query` })
        .reply(400, { success: false, errors: [{ message: "SQL syntax error" }] });

      const response = await authenticatedFetch(`/api/d1/${databaseId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: "INVALID SQL SYNTAX",
        }),
      });

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/d1/:id/validate-query", () => {
    it("should successfully validate query", async () => {
      fetchMock
        .post(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/d1/database/${databaseId}/query`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/d1/database/${databaseId}/query` })
        .reply(200, {
          result: {
            results: [{ name: "test_table" }],
          },
        });

      const response = await authenticatedFetch(`/api/d1/${databaseId}/validate-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "SELECT * FROM test_table",
        }),
      });

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.valid).toBeDefined();
    });
  });

  describe("GET /api/d1/:id/schema", () => {
    it("should successfully get database schema", async () => {
      fetchMock
        .post(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/d1/database/${databaseId}/query`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/d1/database/${databaseId}/query` })
        .reply(200, {
          result: {
            results: [
              { name: "users", sql: "CREATE TABLE users (id INTEGER PRIMARY KEY)" },
            ],
          },
        });

      const response = await authenticatedFetch(`/api/d1/${databaseId}/schema`);

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.tables).toBeDefined();
    });
  });
});

