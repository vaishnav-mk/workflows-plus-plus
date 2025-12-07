import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { fetchMock } from "cloudflare:test";
import { authenticatedFetch, unauthenticatedFetch, parseJsonResponse, createTestCredentials } from "../helpers/test-helpers";

describe("R2 Routes", () => {
  const testCredentials = createTestCredentials();
  const bucketName = "test-bucket";

  beforeAll(() => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.assertNoPendingInterceptors();
  });

  describe("GET /api/r2", () => {
    it("should successfully list R2 buckets", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/r2/buckets`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/r2/buckets` })
        .reply(200, {
          result: [
            { name: bucketName, creation_date: "2024-01-01T00:00:00Z" },
          ],
          result_info: { total_count: 1 },
        });

      const response = await authenticatedFetch("/api/r2?page=1&per_page=1000");

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch("/api/r2");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/r2", () => {
    it("should successfully create bucket", async () => {
      fetchMock
        .post(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/r2/buckets`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/r2/buckets` })
        .reply(200, {
          result: {
            name: "new-bucket",
            creation_date: "2024-01-01T00:00:00Z",
          },
        });

      const response = await authenticatedFetch("/api/r2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "new-bucket",
        }),
      });

      expect(response.status).toBe(201);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("new-bucket");
    });

    it("should fail with invalid bucket name", async () => {
      const response = await authenticatedFetch("/api/r2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Invalid Bucket Name!", // Invalid characters
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/r2/:name/objects", () => {
    it("should successfully list objects", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/r2/buckets/${bucketName}/objects`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/r2/buckets/${bucketName}/objects` })
        .reply(200, {
          result: [
            {
              key: "test-file.txt",
              size: 1024,
              etag: "abc123",
              last_modified: "2024-01-01T00:00:00Z",
            },
          ],
          result_info: {
            cursor: null,
            is_truncated: false,
            per_page: 25,
          },
        });

      const response = await authenticatedFetch(`/api/r2/${bucketName}/objects`);

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.objects).toBeDefined();
      expect(Array.isArray(data.data.objects)).toBe(true);
    });

    it("should handle prefix parameter", async () => {
      fetchMock
        .get(`https://api.cloudflare.com/client/v4/accounts/${testCredentials.accountId}/r2/buckets/${bucketName}/objects`)
        .intercept({ path: `/accounts/${testCredentials.accountId}/r2/buckets/${bucketName}/objects` })
        .reply(200, {
          result: [],
          result_info: { is_truncated: false },
        });

      const response = await authenticatedFetch(`/api/r2/${bucketName}/objects?prefix=images/`);

      expect(response.status).toBe(200);
    });

    it("should fail without authentication", async () => {
      const response = await unauthenticatedFetch(`/api/r2/${bucketName}/objects`);

      expect(response.status).toBe(401);
    });
  });
});

