import { tokenStorage } from "./token-storage";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787/api";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

const pendingRequests = new Map<string, Promise<ApiResponse<any>>>();

class ApiClient {
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit,
    dedupeKey?: string
  ): Promise<ApiResponse<T>> {
      if (dedupeKey) {
        const existing = pendingRequests.get(dedupeKey);
        if (existing) {
          return existing as Promise<ApiResponse<T>>;
        }
      }
    
    const fetchPromise = (async () => {
      try {
        const url = `${API_BASE}${endpoint}`;
        const token = tokenStorage.getToken();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...options?.headers,
        };

        if (token) {
          (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (response.status === 401) {
          tokenStorage.removeToken();
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/setup")) {
            window.location.href = "/setup";
          }
          return {
            success: false,
            error: "Unauthorized",
            message: "Please configure Cloudflare credentials"
          };
        }

        const data = await response.json();
        return data;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      } finally {
        if (dedupeKey) {
          pendingRequests.delete(dedupeKey);
        }
      }
    })();

    if (dedupeKey) {
      pendingRequests.set(dedupeKey, fetchPromise);
    }

    return fetchPromise;
  }

  async getCatalog(): Promise<ApiResponse<any[]>> {
    const rawResponse = await fetch(`${API_BASE}/catalog`, {
      headers: { "Content-Type": "application/json" },
    });
    
    const data = await rawResponse.json();
    
    if (Array.isArray(data)) {
      return { success: true, data };
    }
    
    if (data.success && Array.isArray(data.data)) {
      return { success: true, data: data.data };
    }
    
    return { success: false, error: "Failed to parse catalog response" };
  }

  async getNodeDefinition(nodeType: string): Promise<ApiResponse<any>> {
    const result = await this.fetch<any>(
      `/catalog/${nodeType}`,
      undefined,
      `node-def-${nodeType}`
    );
    return result;
  }

  async compileWorkflow(workflow: {
    name: string;
    nodes: any[];
    edges: any[];
    options?: any;
  }): Promise<ApiResponse<any>> {
    return this.fetch("/compiler/compile", {
      method: "POST",
      body: JSON.stringify(workflow),
    });
  }

  async resolveWorkflowTemplates(workflow: {
    nodes: any[];
    edges: any[];
  }): Promise<ApiResponse<any>> {
    return this.fetch("/compiler/resolve-workflow", {
      method: "POST",
      body: JSON.stringify(workflow),
    });
  }

  async reverseCodegen(code: string): Promise<ApiResponse<{
    nodes: Array<{
      id: string;
      type: string;
      data?: {
        label?: string;
        config?: Record<string, unknown>;
      };
      config?: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  }>> {
    return this.fetch("/compiler/reverse-codegen", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async validateWorkflow(workflow: {
    name: string;
    nodes: any[];
    edges: any[];
  }): Promise<ApiResponse<any>> {
    return this.fetch("/workflows/validate", {
      method: "POST",
      body: JSON.stringify(workflow),
    });
  }

  async getWorkflows(page = 1, perPage = 10): Promise<ApiResponse<any>> {
    return this.fetch(`/workflows?page=${page}&per_page=${perPage}`);
  }

  async createWorkflow(workflow: any): Promise<ApiResponse<any>> {
    return this.fetch("/workflows", {
      method: "POST",
      body: JSON.stringify(workflow),
    });
  }

  async deployWorkflow(
    workflowId: string,
    options: {
      workflowName?: string;
      subdomain?: string;
      bindings?: any[];
      assets?: Record<string, any>;
      nodes?: any[];
      edges?: any[];
    }
  ): Promise<ApiResponse<any>> {
    return this.fetch(`/workflows/${workflowId}/deploy`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  async getDeploymentStatus(deploymentId: string): Promise<ApiResponse<any>> {
    return this.fetch(`/deployments/${deploymentId}/status`);
  }

  async getInstances(workflowName: string): Promise<ApiResponse<any>> {
    return this.fetch(`/workflows/${workflowName}/instances`);
  }

  async getInstance(
    workflowName: string,
    instanceId: string
  ): Promise<ApiResponse<any>> {
    return this.fetch(
      `/workflows/${workflowName}/instances/${instanceId}`,
      undefined,
      `instance-${workflowName}-${instanceId}`
    );
  }

  async getWorkers(page = 1, perPage = 10): Promise<ApiResponse<any>> {
    return this.fetch(`/workers?page=${page}&per_page=${perPage}`);
  }

  async getWorker(workerId: string): Promise<ApiResponse<any>> {
    return this.fetch(`/workers/${workerId}`, undefined, `worker-${workerId}`);
  }

  async getWorkerVersions(
    workerId: string,
    page = 1,
    perPage = 10
  ): Promise<ApiResponse<any>> {
    return this.fetch(
      `/workers/${workerId}/versions?page=${page}&per_page=${perPage}`
    );
  }

  async getWorkerVersion(
    workerId: string,
    versionId: string,
    include?: string
  ): Promise<ApiResponse<any>> {
    const qs = include ? `?include=${encodeURIComponent(include)}` : "";
    return this.fetch(
      `/workers/${workerId}/versions/${versionId}${qs}`,
      undefined,
      `worker-version-${workerId}-${versionId}`
    );
  }

  async executeNode(input: any): Promise<ApiResponse<any>> {
    return this.fetch("/nodes/execute", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async generateWorkflowFromAI(options: {
    image?: string;
    imageMimeType?: string;
    text?: string;
  }): Promise<ApiResponse<any>> {
    return this.fetch("/workflows/generate", {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  async logout(): Promise<ApiResponse<any>> {
    tokenStorage.removeToken();
    return this.fetch("/setup/logout", {
      method: "POST",
    });
  }

  async getWorkflowStarters(filter?: { category?: string; difficulty?: string; tags?: string[] }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filter?.category) params.append('category', filter.category);
    if (filter?.difficulty) params.append('difficulty', filter.difficulty);
    if (filter?.tags) params.append('tags', filter.tags.join(','));
    
    const query = params.toString();
    return this.fetch(`/starters${query ? `?${query}` : ''}`);
  }

  async getWorkflowStarter(id: string): Promise<ApiResponse<any>> {
    return this.fetch(`/starters/${id}`);
  }

  async getStarterCategories(): Promise<ApiResponse<string[]>> {
    return this.fetch(`/starters/categories`);
  }

  async getD1Databases(page = 1, perPage = 1000, name?: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('per_page', String(perPage));
    if (name) params.append('name', name);
    
    return this.fetch(`/d1?${params.toString()}`);
  }

  async getD1Database(databaseId: string): Promise<ApiResponse<any>> {
    return this.fetch(`/d1/${databaseId}`, undefined, `d1-db-${databaseId}`);
  }

  async createD1Database(name: string): Promise<ApiResponse<any>> {
    return this.fetch("/d1", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async getD1DatabaseSchema(databaseId: string): Promise<ApiResponse<any>> {
    return this.fetch(`/d1/${databaseId}/schema`, undefined, `d1-schema-${databaseId}`);
  }

  async validateD1Query(databaseId: string, query: string): Promise<ApiResponse<any>> {
    return this.fetch(`/d1/${databaseId}/validate-query`, {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  }

  async executeD1Query(databaseId: string, sql: string): Promise<ApiResponse<any>> {
    return this.fetch(`/d1/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify({ sql }),
    });
  }

  async getKVNamespaces(page = 1, perPage = 1000): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('per_page', String(perPage));
    
    return this.fetch(`/kv?${params.toString()}`);
  }

  async getKVNamespace(namespaceId: string): Promise<ApiResponse<any>> {
    return this.fetch(`/kv/${namespaceId}`, undefined, `kv-ns-${namespaceId}`);
  }

  async createKVNamespace(title: string): Promise<ApiResponse<any>> {
    return this.fetch("/kv", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  }

  async getR2Buckets(page = 1, perPage = 1000): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('per_page', String(perPage));
    
    return this.fetch(`/r2?${params.toString()}`);
  }

  async getR2Bucket(bucketName: string): Promise<ApiResponse<any>> {
    return this.fetch(`/r2/${encodeURIComponent(bucketName)}`, undefined, `r2-bucket-${bucketName}`);
  }

  async createR2Bucket(name: string, location?: string): Promise<ApiResponse<any>> {
    return this.fetch("/r2", {
      method: "POST",
      body: JSON.stringify({ name, location }),
    });
  }

  async listR2Objects(bucketName: string, prefix = "", perPage = 25, cursor?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    params.append('per_page', String(perPage));
    if (prefix) params.append('prefix', prefix);
    if (cursor) params.append('cursor', cursor);
    
    return this.fetch(`/r2/${encodeURIComponent(bucketName)}/objects?${params.toString()}`);
  }
}

export const apiClient = new ApiClient();
