import { apiClient } from "@/lib/api-client";
import { isSuccessResponse, getResponseError } from "@/lib/api/utils";
import type { D1Database, KVNamespace, R2Bucket } from "@/lib/api/types";
import type { ResourceSelectorConfig } from "@/types/resource-selector";

export function createD1DatabaseConfig(
  nodeId: string,
  searchParams: URLSearchParams
): ResourceSelectorConfig {
  const workflowId = searchParams.get("id");
  
  return {
    label: "D1 Database",
    placeholder: "Select a database...",
    createLabel: "+ Create Database",
    createPlaceholder: "my-database",
    loadingText: "Loading databases...",
    getId: (db: D1Database) => db.uuid,
    getName: (db: D1Database) => db.name,
    getDisplayLabel: (db: D1Database) => `${db.name} (${db.uuid.slice(0, 8)}...)`,
    loadResources: async () => {
      const response = await apiClient.getD1Databases();
      if (isSuccessResponse(response)) {
        return response.data;
      }
      throw new Error(getResponseError(response) || "Failed to load databases");
    },
    createResource: async (name: string) => {
      const response = await apiClient.createD1Database(name);
      if (isSuccessResponse(response)) {
        return response.data;
      }
      throw new Error(getResponseError(response) || "Failed to create database");
    },
    configFields: {
      idField: "database_id",
      nameField: "database"
    },
    customManagerLink: {
      href: (selectedId: string, nodeId: string, workflowId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("returnToBuilder", "true");
        params.set("returnNodeId", nodeId);
        if (workflowId) {
          params.set("workflowId", workflowId);
        }
        return `/databases/${selectedId}?${params.toString()}`;
      },
      label: "Open Database Manager"
    },
  };
}

export function createKVNamespaceConfig(): ResourceSelectorConfig {
  return {
    label: "KV Namespace",
    placeholder: "Select a namespace...",
    createLabel: "+ Create Namespace",
    createPlaceholder: "my-kv-namespace",
    loadingText: "Loading namespaces...",
    getId: (ns: KVNamespace) => ns.id,
    getName: (ns: KVNamespace) => ns.title,
    getDisplayLabel: (ns: KVNamespace) => `${ns.title} (${ns.id.slice(0, 8)}...)`,
    loadResources: async () => {
      const response = await apiClient.getKVNamespaces();
      if (isSuccessResponse(response)) {
        return response.data;
      }
      throw new Error(getResponseError(response) || "Failed to load namespaces");
    },
    createResource: async (title: string) => {
      const response = await apiClient.createKVNamespace(title);
      if (isSuccessResponse(response)) {
        return response.data;
      }
      throw new Error(getResponseError(response) || "Failed to create namespace");
    },
    configFields: {
      idField: "namespace_id",
      nameField: "namespace"
    }
  };
}

export function createR2BucketConfig(
  nodeData: any,
  onNodeUpdate: (nodeId: string, updates: any) => void,
  nodeId: string
): ResourceSelectorConfig {
  return {
    label: "R2 Bucket",
    placeholder: "Select a bucket...",
    createLabel: "+ Create Bucket",
    createPlaceholder: "my-bucket-name",
    loadingText: "Loading buckets...",
    getId: (bucket: R2Bucket) => bucket.name,
    getName: (bucket: R2Bucket) => bucket.name,
    getDisplayLabel: (bucket: R2Bucket) => bucket.name,
    loadResources: async () => {
      const response = await apiClient.getR2Buckets();
      if (isSuccessResponse(response)) {
        return response.data || [];
      }
      throw new Error(getResponseError(response) || "Failed to load buckets");
    },
    createResource: async (name: string) => {
      const response = await apiClient.createR2Bucket(name);
      if (isSuccessResponse(response)) {
        return response.data;
      }
      throw new Error(getResponseError(response) || "Failed to create bucket");
    },
    validateCreateName: (name: string) => {
      if (name.length < 3 || name.length > 63) {
        return "Bucket name must be between 3 and 63 characters";
      }
      const bucketNameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
      if (!bucketNameRegex.test(name)) {
        return "Bucket name must be lowercase alphanumeric with hyphens, and start/end with alphanumeric";
      }
      return null;
    },
    transformCreateName: (name: string) => name.toLowerCase(),
    configFields: {
      idField: "bucket",
      nameField: "bucket"
    }
  };
}

