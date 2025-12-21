import { endpoints } from "./endpoints";
import { requestInterceptor, responseInterceptor, errorInterceptor } from "./interceptors";
import type { ApiResponse } from "./types";
import type {
  CatalogItem,
  NodeDefinition,
  Workflow,
  WorkflowNode,
  Worker,
  WorkerVersion,
  DeploymentStateResponse,
  WorkflowStarter,
  D1Database,
  D1DatabaseSchema,
  D1DatabaseQueryRequest,
  D1DatabaseQueryResponse,
  KVNamespace,
  R2Bucket,
  R2Object,
  R2ObjectsResponse,
  KVKey,
  KVKeysResponse,
  CompileWorkflowRequest,
  CompileWorkflowResponse,
  ReverseCodegenRequest,
  ReverseCodegenResponse,
  ResolveWorkflowRequest,
  GenerateWorkflowFromAIRequest,
  GenerateWorkflowFromAIResponse,
  ValidateWorkflowRequest,
  DeployWorkflowRequest,
  DeployWorkflowResponse,
  ExecuteNodeRequest,
} from "./types";

class ApiClient {
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const interceptedOptions = requestInterceptor(endpoint, options);
    
    try {
      const response = await fetch(endpoint, interceptedOptions);
      const result = await responseInterceptor<T>(response);
      return result;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[API] ${options.method || 'GET'} ${endpoint} - Error:`, error);
      }
      return errorInterceptor(error);
    }
  }

  async getCatalog(): Promise<ApiResponse<CatalogItem[]>> {
    return this.fetch<CatalogItem[]>(endpoints.catalog.list);
  }

  async getNodeDefinition(nodeType: string): Promise<ApiResponse<NodeDefinition>> {
    return this.fetch<NodeDefinition>(endpoints.catalog.getNode(nodeType));
  }

  async getWorkflows(
    page: number = 1,
    perPage: number = 10
  ): Promise<ApiResponse<Workflow[]>> {
    return this.fetch<Workflow[]>(endpoints.workflows.list(page, perPage));
  }

  async getWorkflow(workflowId: string): Promise<ApiResponse<Workflow>> {
    return this.fetch<Workflow>(endpoints.workflows.get(workflowId));
  }

  async createWorkflow(workflow: Workflow): Promise<ApiResponse<Workflow>> {
    return this.fetch<Workflow>(endpoints.workflows.create, {
      method: "POST",
      body: JSON.stringify(workflow),
    });
  }

  async getWorkers(
    page: number = 1,
    perPage: number = 10
  ): Promise<ApiResponse<Worker[]>> {
    return this.fetch<Worker[]>(endpoints.workers.list(page, perPage));
  }

  async getWorker(workerId: string): Promise<ApiResponse<Worker>> {
    return this.fetch<Worker>(endpoints.workers.get(workerId));
  }

  async getWorkerVersions(
    workerId: string,
    page: number = 1,
    perPage: number = 10
  ): Promise<ApiResponse<WorkerVersion[]>> {
    return this.fetch<WorkerVersion[]>(
      endpoints.workers.getVersions(workerId, page, perPage)
    );
  }

  async getWorkerVersion(
    workerId: string,
    versionId: string,
    include?: string
  ): Promise<ApiResponse<WorkerVersion>> {
    return this.fetch<WorkerVersion>(
      endpoints.workers.getVersion(workerId, versionId, include || "")
    );
  }

  async getInstances(workflowName: string): Promise<ApiResponse<unknown[]>> {
    return this.fetch<unknown[]>(endpoints.workflows.getInstances(workflowName));
  }

  async getInstance(
    workflowName: string,
    instanceId: string
  ): Promise<ApiResponse<unknown>> {
    return this.fetch<unknown>(
      endpoints.workflows.getInstance(workflowName, instanceId)
    );
  }

  async getDeploymentStatus(
    deploymentId: string
  ): Promise<ApiResponse<DeploymentStateResponse>> {
    return this.fetch<DeploymentStateResponse>(
      endpoints.deployments.getStatus(deploymentId)
    );
  }

  async getWorkflowStarters(filter: {
    category: string;
    difficulty: string;
    tags: string[];
  }): Promise<ApiResponse<WorkflowStarter[]>> {
    return this.fetch<WorkflowStarter[]>(endpoints.starters.list(filter));
  }

  async getWorkflowStarter(id: string): Promise<ApiResponse<WorkflowStarter>> {
    return this.fetch<WorkflowStarter>(endpoints.starters.get(id));
  }

  async getStarterCategories(): Promise<ApiResponse<unknown[]>> {
    return this.fetch<unknown[]>(endpoints.starters.getCategories);
  }

  async getD1Databases(): Promise<ApiResponse<D1Database[]>> {
    return this.fetch<D1Database[]>(endpoints.d1.list(1, 100, ""));
  }

  async getD1Database(databaseId: string): Promise<ApiResponse<D1Database>> {
    return this.fetch<D1Database>(endpoints.d1.get(databaseId));
  }

  async createD1Database(name: string): Promise<ApiResponse<D1Database>> {
    return this.fetch<D1Database>(endpoints.d1.create, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async getD1DatabaseSchema(databaseId: string): Promise<ApiResponse<D1DatabaseSchema>> {
    return this.fetch<D1DatabaseSchema>(endpoints.d1.getSchema(databaseId));
  }

  async executeD1Query(
    databaseId: string,
    query: string
  ): Promise<ApiResponse<D1DatabaseQueryResponse>> {
    const request: D1DatabaseQueryRequest = { query, sql: query };
    return this.fetch<D1DatabaseQueryResponse>(endpoints.d1.query(databaseId), {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getKVNamespaces(): Promise<ApiResponse<KVNamespace[]>> {
    return this.fetch<KVNamespace[]>(endpoints.kv.list(1, 100));
  }

  async getKVNamespace(namespaceId: string): Promise<ApiResponse<KVNamespace>> {
    return this.fetch<KVNamespace>(endpoints.kv.get(namespaceId));
  }

  async createKVNamespace(title: string): Promise<ApiResponse<KVNamespace>> {
    return this.fetch<KVNamespace>(endpoints.kv.create, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  }

  async listKVKeys(
    namespaceId: string,
    prefix: string = "",
    limit: number = 1000,
    cursor: string = ""
  ): Promise<ApiResponse<KVKeysResponse>> {
    return this.fetch<KVKeysResponse>(
      endpoints.kv.listKeys(namespaceId, prefix, limit, cursor)
    );
  }

  async getR2Buckets(): Promise<ApiResponse<R2Bucket[]>> {
    return this.fetch<R2Bucket[]>(endpoints.r2.list(1, 100));
  }

  async getR2Bucket(bucketName: string): Promise<ApiResponse<R2Bucket>> {
    return this.fetch<R2Bucket>(endpoints.r2.get(bucketName));
  }

  async createR2Bucket(name: string): Promise<ApiResponse<R2Bucket>> {
    return this.fetch<R2Bucket>(endpoints.r2.create, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async listR2Objects(
    bucketName: string,
    prefix: string = "",
    perPage: number = 100,
    cursor: string = ""
  ): Promise<ApiResponse<R2ObjectsResponse>> {
    return this.fetch<R2ObjectsResponse>(
      endpoints.r2.listObjects(bucketName, prefix, perPage, cursor)
    );
  }

  async compileWorkflow(
    request: CompileWorkflowRequest
  ): Promise<ApiResponse<CompileWorkflowResponse>> {
    return this.fetch<CompileWorkflowResponse>(endpoints.compiler.compile, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async reverseCodegen(
    code: string
  ): Promise<ApiResponse<ReverseCodegenResponse>> {
    const request: ReverseCodegenRequest = { code };
    return this.fetch<ReverseCodegenResponse>(endpoints.compiler.reverseCodegen, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async resolveWorkflowTemplates(
    request: ResolveWorkflowRequest
  ): Promise<ApiResponse<unknown>> {
    return this.fetch<unknown>(endpoints.compiler.resolveWorkflow, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async generateWorkflowFromAI(
    request: GenerateWorkflowFromAIRequest
  ): Promise<ApiResponse<GenerateWorkflowFromAIResponse>> {
    return this.fetch<GenerateWorkflowFromAIResponse>(endpoints.workflows.generate, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async logout(): Promise<ApiResponse<unknown>> {
    return this.fetch<unknown>(endpoints.setup.logout, {
      method: "POST",
    });
  }

  async getTestCredentials(): Promise<ApiResponse<{ apiToken: string; accountId: string }>> {
    return this.fetch<{ apiToken: string; accountId: string }>(endpoints.setup.testCredentials);
  }

  async validateWorkflow(
    request: ValidateWorkflowRequest
  ): Promise<ApiResponse<unknown>> {
    return this.fetch<unknown>(endpoints.workflows.validate, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async deployWorkflow(
    workflowId: string,
    request: DeployWorkflowRequest
  ): Promise<ApiResponse<DeployWorkflowResponse>> {
    return this.fetch<DeployWorkflowResponse>(endpoints.workflows.deploy(workflowId), {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async executeNode(
    request: ExecuteNodeRequest
  ): Promise<ApiResponse<unknown>> {
    return this.fetch<unknown>(endpoints.nodes.execute, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }
}

export const apiClient = new ApiClient();

