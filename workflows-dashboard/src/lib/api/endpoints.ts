import { API_BASE, PAGINATION } from "@/config/constants";

export const endpoints = {
  catalog: {
    list: `${API_BASE}/catalog`,
    getNode: (nodeType: string) => `${API_BASE}/catalog/${nodeType}`,
  },
  compiler: {
    compile: `${API_BASE}/compiler/compile`,
    resolveWorkflow: `${API_BASE}/compiler/resolve-workflow`,
    reverseCodegen: `${API_BASE}/compiler/reverse-codegen`,
  },
  workflows: {
    list: (page: number = PAGINATION.DEFAULT_PAGE, perPage: number = PAGINATION.DEFAULT_PER_PAGE) =>
      `${API_BASE}/workflows?page=${page}&per_page=${perPage}`,
    get: (workflowId: string) => `${API_BASE}/workflows/${workflowId}`,
    create: `${API_BASE}/workflows`,
    validate: `${API_BASE}/workflows/validate`,
    deploy: (workflowId: string) =>
      `${API_BASE}/workflows/${workflowId}/deploy`,
    generate: `${API_BASE}/workflows/generate`,
    getInstances: (workflowName: string) =>
      `${API_BASE}/workflows/${workflowName}/instances`,
    getInstance: (workflowName: string, instanceId: string) =>
      `${API_BASE}/workflows/${workflowName}/instances/${instanceId}`,
  },
  deployments: {
    list: `${API_BASE}/deployments`,
    getStatus: (deploymentId: string) =>
      `${API_BASE}/deployments/${deploymentId}/status`,
  },
  workers: {
    list: (page: number = PAGINATION.DEFAULT_PAGE, perPage: number = PAGINATION.DEFAULT_PER_PAGE) =>
      `${API_BASE}/workers?page=${page}&per_page=${perPage}`,
    get: (workerId: string) => `${API_BASE}/workers/${workerId}`,
    getVersions: (workerId: string, page: number = PAGINATION.DEFAULT_PAGE, perPage: number = PAGINATION.DEFAULT_PER_PAGE) =>
      `${API_BASE}/workers/${workerId}/versions?page=${page}&per_page=${perPage}`,
    getVersion: (workerId: string, versionId: string, include: string) => {
      const qs = include ? `?include=${encodeURIComponent(include)}` : "";
      return `${API_BASE}/workers/${workerId}/versions/${versionId}${qs}`;
    },
  },
  nodes: {
    execute: `${API_BASE}/nodes/execute`,
  },
  starters: {
    list: (filter: { category: string; difficulty: string; tags: string[] }) => {
      const params = new URLSearchParams();
      if (filter.category) params.append("category", filter.category);
      if (filter.difficulty) params.append("difficulty", filter.difficulty);
      if (filter.tags.length > 0) params.append("tags", filter.tags.join(","));
      const query = params.toString();
      return `${API_BASE}/starters${query ? `?${query}` : ""}`;
    },
    get: (id: string) => `${API_BASE}/starters/${id}`,
    getCategories: `${API_BASE}/starters/categories`,
  },
  d1: {
    list: (page: number = PAGINATION.DEFAULT_PAGE, perPage: number = PAGINATION.DATABASE_PER_PAGE, name: string) => {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("per_page", String(perPage));
      if (name) params.append("name", name);
      return `${API_BASE}/d1?${params.toString()}`;
    },
    get: (databaseId: string) => `${API_BASE}/d1/${databaseId}`,
    create: `${API_BASE}/d1`,
    getSchema: (databaseId: string) =>
      `${API_BASE}/d1/${databaseId}/schema`,
    validateQuery: (databaseId: string) =>
      `${API_BASE}/d1/${databaseId}/validate-query`,
    query: (databaseId: string) => `${API_BASE}/d1/${databaseId}/query`,
  },
  kv: {
    list: (page: number = PAGINATION.DEFAULT_PAGE, perPage: number = PAGINATION.DATABASE_PER_PAGE) => {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("per_page", String(perPage));
      return `${API_BASE}/kv?${params.toString()}`;
    },
    get: (namespaceId: string) => `${API_BASE}/kv/${namespaceId}`,
    create: `${API_BASE}/kv`,
    listKeys: (
      namespaceId: string,
      prefix: string = "",
      limit: number = 1000,
      cursor: string = ""
    ) => {
      const params = new URLSearchParams();
      params.append("limit", String(limit));
      if (prefix) params.append("prefix", prefix);
      if (cursor) params.append("cursor", cursor);
      return `${API_BASE}/kv/${namespaceId}/keys?${params.toString()}`;
    },
  },
  r2: {
    list: (page: number = PAGINATION.DEFAULT_PAGE, perPage: number = PAGINATION.DATABASE_PER_PAGE) => {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("per_page", String(perPage));
      return `${API_BASE}/r2?${params.toString()}`;
    },
    get: (bucketName: string) =>
      `${API_BASE}/r2/${encodeURIComponent(bucketName)}`,
    create: `${API_BASE}/r2`,
    listObjects: (
      bucketName: string,
      prefix: string = "",
      perPage: number = PAGINATION.R2_OBJECTS_PER_PAGE,
      cursor: string = ""
    ) => {
      const params = new URLSearchParams();
      params.append("per_page", String(perPage));
      if (prefix) params.append("prefix", prefix);
      if (cursor) params.append("cursor", cursor);
      return `${API_BASE}/r2/${encodeURIComponent(bucketName)}/objects?${params.toString()}`;
    },
  },
  setup: {
    base: `${API_BASE}/setup`,
    stream: `${API_BASE}/setup/stream`,
    logout: `${API_BASE}/setup/logout`,
    testCredentials: `${API_BASE}/setup/test-credentials`,
  },
  aiSearch: {
    list: (page: number = PAGINATION.DEFAULT_PAGE, perPage: number = PAGINATION.DATABASE_PER_PAGE) => {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("per_page", String(perPage));
      return `${API_BASE}/ai-search?${params.toString()}`;
    },
    get: (id: string) => `${API_BASE}/ai-search/${id}`,
  },
  aiModels: {
    search: () => `${API_BASE}/ai/models/search`,
  },
} as const;
