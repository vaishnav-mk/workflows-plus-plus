/**
 * Unified API Client
 * Single source of truth for all API calls with request deduplication
 * Note: Caching is handled by TanStack Query, not this client
 */

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

// Request deduplication - prevent multiple identical requests
const pendingRequests = new Map<string, Promise<ApiResponse<any>>>();

class ApiClient {
  /**
   * Generic fetch wrapper with error handling and request deduplication
   */
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit,
    dedupeKey?: string
  ): Promise<ApiResponse<T>> {
    // Use deduplication if key provided
      if (dedupeKey) {
        const existing = pendingRequests.get(dedupeKey);
        if (existing) {
          const dedupeMsg = `[API Client] Request deduplicated: ${endpoint} (key: ${dedupeKey})`;
          console.log(dedupeMsg);
          return existing as Promise<ApiResponse<T>>;
        }
      }

    const logMessage = `[API Client] Making request: ${endpoint}${dedupeKey ? ` (key: ${dedupeKey})` : ''}`;
    console.log(logMessage);
    
    const fetchPromise = (async () => {
      try {
        const url = `${API_BASE}${endpoint}`;
        console.log(`[API Client] Fetching:`, url);
        const response = await fetch(url, {
          ...options,
          credentials: "include", // Include cookies in requests
          headers: {
            "Content-Type": "application/json",
            ...options?.headers,
          },
        });

        // Handle 401 Unauthorized - redirect to setup
        if (response.status === 401) {
          // Only redirect if not already on setup page
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
        const responseInfo = {
          success: data.success,
          hasData: !!data.data,
          isArray: Array.isArray(data),
          dataLength: Array.isArray(data) 
            ? data.length 
            : Array.isArray(data.data) 
              ? data.data.length 
              : data.data ? 'object' : 'null'
        };
        console.log(`[API Client] Response for ${endpoint}:`, responseInfo);
        return data;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      } finally {
        // Remove from pending requests after completion
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

  /**
   * Catalog API
   * Note: Caching is handled by TanStack Query
   */
  async getCatalog(): Promise<ApiResponse<any[]>> {
    // The /catalog endpoint returns the array directly, not wrapped in {success, data}
    const rawResponse = await fetch(`${API_BASE}/catalog`, {
      headers: { "Content-Type": "application/json" },
    });
    
    const data = await rawResponse.json();
    const catalogInfo = {
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 'not array'
    };
    console.log(`[API Client] Catalog raw response:`, catalogInfo);
    
    // Handle direct array response (backend returns array directly)
    if (Array.isArray(data)) {
      return { success: true, data };
    }
    
    // Fallback: handle wrapped response if backend changes
    if (data.success && Array.isArray(data.data)) {
      return { success: true, data: data.data };
    }
    
    return { success: false, error: "Failed to parse catalog response" };
  }

  async getNodeDefinition(nodeType: string): Promise<ApiResponse<any>> {
    console.log(`[API Client] Fetching node definition: ${nodeType}`);
    const result = await this.fetch<any>(
      `/catalog/${nodeType}`,
      undefined,
      `node-def-${nodeType}`
    );
    if (!result.success) {
      const errorMsg = result.error || 'Unknown error';
      console.warn(`[API Error] Failed to fetch node definition for ${nodeType}: ${errorMsg}`);
    }
    return result;
  }

  /**
   * Compiler API
   */
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

  /**
   * Workflow API
   */
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

  /**
   * Worker API
   */
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

  /**
   * Node Execution API
   */
  async executeNode(input: any): Promise<ApiResponse<any>> {
    return this.fetch("/nodes/execute", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /**
   * AI Workflow Generation API
   */
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

  /**
   * Auth API
   */
  async logout(): Promise<ApiResponse<any>> {
    return this.fetch("/setup/logout", {
      method: "POST",
    });
  }

  // Workflow Starters
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

  /**
   * D1 Database API
   */
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

  /**
   * KV Namespace API
   */
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

  // R2 Bucket methods
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
