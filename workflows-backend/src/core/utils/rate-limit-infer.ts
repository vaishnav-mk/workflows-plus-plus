import { RATE_LIMIT } from "../constants";

interface RoutePattern {
  method: string;
  path: string;
  callType: string;
}

const ROUTE_PATTERNS: RoutePattern[] = [
  { method: "GET", path: "/api/d1", callType: RATE_LIMIT.CALL_TYPE.D1_READ },
  { method: "POST", path: "/api/d1", callType: RATE_LIMIT.CALL_TYPE.D1_WRITE },
  { method: "POST", path: "/api/d1/:id/query", callType: RATE_LIMIT.CALL_TYPE.D1_QUERY },
  { method: "POST", path: "/api/d1/:id/validate-query", callType: RATE_LIMIT.CALL_TYPE.D1_QUERY },
  { method: "GET", path: "/api/d1/:id/schema", callType: RATE_LIMIT.CALL_TYPE.D1_READ },
  { method: "GET", path: "/api/kv", callType: RATE_LIMIT.CALL_TYPE.KV_READ },
  { method: "POST", path: "/api/kv", callType: RATE_LIMIT.CALL_TYPE.KV_WRITE },
  { method: "GET", path: "/api/kv/:id/keys", callType: RATE_LIMIT.CALL_TYPE.KV_READ },
  { method: "GET", path: "/api/r2", callType: RATE_LIMIT.CALL_TYPE.R2_LIST },
  { method: "POST", path: "/api/r2", callType: RATE_LIMIT.CALL_TYPE.R2_WRITE },
  { method: "GET", path: "/api/r2/:name/objects", callType: RATE_LIMIT.CALL_TYPE.R2_LIST },
  { method: "GET", path: "/api/workflows", callType: RATE_LIMIT.CALL_TYPE.WORKFLOW_READ },
  { method: "POST", path: "/api/workflows/validate", callType: RATE_LIMIT.CALL_TYPE.COMPILER_VALIDATE },
  { method: "POST", path: "/api/workflows/:id/deploy", callType: RATE_LIMIT.CALL_TYPE.WORKFLOW_DEPLOY },
  { method: "POST", path: "/api/workflows/generate", callType: RATE_LIMIT.CALL_TYPE.AI_GENERATE },
  { method: "GET", path: "/api/workflows/:workflowName/instances", callType: RATE_LIMIT.CALL_TYPE.INSTANCE_READ },
  { method: "GET", path: "/api/workflows/:workflowName/instances/:instanceId", callType: RATE_LIMIT.CALL_TYPE.INSTANCE_READ },
  { method: "GET", path: "/api/workflows/:workflowName/instances/:instanceId/logs/tail-url", callType: RATE_LIMIT.CALL_TYPE.INSTANCE_READ },
  { method: "GET", path: "/api/workers", callType: RATE_LIMIT.CALL_TYPE.WORKER_READ },
  { method: "GET", path: "/api/workers/:workerId/versions", callType: RATE_LIMIT.CALL_TYPE.WORKER_READ },
  { method: "GET", path: "/api/workers/:workerId/versions/:versionId", callType: RATE_LIMIT.CALL_TYPE.WORKER_READ },
  { method: "POST", path: "/api/compiler/compile", callType: RATE_LIMIT.CALL_TYPE.COMPILER_COMPILE },
  { method: "POST", path: "/api/compiler/preview", callType: RATE_LIMIT.CALL_TYPE.COMPILER_PREVIEW },
  { method: "POST", path: "/api/compiler/validate-bindings", callType: RATE_LIMIT.CALL_TYPE.COMPILER_VALIDATE },
  { method: "POST", path: "/api/compiler/validate-templates", callType: RATE_LIMIT.CALL_TYPE.COMPILER_VALIDATE },
  { method: "POST", path: "/api/compiler/resolve-workflow", callType: RATE_LIMIT.CALL_TYPE.COMPILER_RESOLVE },
  { method: "POST", path: "/api/compiler/resolve-node/:nodeId", callType: RATE_LIMIT.CALL_TYPE.COMPILER_RESOLVE },
  { method: "POST", path: "/api/compiler/reverse-codegen", callType: RATE_LIMIT.CALL_TYPE.COMPILER_REVERSE },
  { method: "POST", path: "/api/nodes/execute", callType: RATE_LIMIT.CALL_TYPE.NODE_EXECUTE },
  { method: "POST", path: "/api/nodes/validate", callType: RATE_LIMIT.CALL_TYPE.NODE_VALIDATE },
  { method: "GET", path: "/api/catalog", callType: RATE_LIMIT.CALL_TYPE.CATALOG_READ },
  { method: "GET", path: "/api/starters", callType: RATE_LIMIT.CALL_TYPE.STARTER_READ },
  { method: "GET", path: "/api/deployments/:deploymentId/stream", callType: RATE_LIMIT.CALL_TYPE.DEPLOYMENT_STREAM },
  { method: "GET", path: "/api/deployments/:deploymentId/status", callType: RATE_LIMIT.CALL_TYPE.DEPLOYMENT_STATUS },
  { method: "POST", path: "/api/setup", callType: RATE_LIMIT.CALL_TYPE.SETUP },
  { method: "POST", path: "/api/setup/stream", callType: RATE_LIMIT.CALL_TYPE.SETUP },
  { method: "POST", path: "/api/setup/logout", callType: RATE_LIMIT.CALL_TYPE.SETUP }
];

function normalizePath(path: string): string {
  return path.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function matchPath(pattern: string, actual: string): boolean {
  const patternParts = normalizePath(pattern).split("/");
  const actualParts = normalizePath(actual).split("/");

  if (patternParts.length !== actualParts.length) {
    return false;
  }

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const actualPart = actualParts[i];

    if (patternPart.startsWith(":")) {
      continue;
    }

    if (patternPart !== actualPart) {
      return false;
    }
  }

  return true;
}

export function inferCallType(method: string, path: string): string | null {
  const normalizedPath = normalizePath(path);

  for (const pattern of ROUTE_PATTERNS) {
    if (pattern.method === method && matchPath(pattern.path, normalizedPath)) {
      return pattern.callType;
    }
  }

  return null;
}

