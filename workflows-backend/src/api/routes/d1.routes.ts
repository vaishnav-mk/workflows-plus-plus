import { Hono } from "hono";
import { z } from "zod";
import { HTTP_STATUS_CODES, MESSAGES, CLOUDFLARE } from "../../core/constants";
import { ApiResponse } from "../../types/api";
import { createPaginationResponse } from "../../core/utils/pagination";
import { PaginationQuerySchema, DatabaseIdParamSchema } from "../../core/validation/schemas";
import { safe } from "../../core/utils/route-helpers";
import { zValidator } from "../../api/middleware/validation.middleware";
import { ContextWithCredentials } from "../../types/routes";

const app = new Hono<ContextWithCredentials>();

async function fetchCloudflare(url: string, options: RequestInit) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || `HTTP ${response.status}` };
    }
    
    throw new Error(`${response.status} ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

app.get("/", zValidator('query', PaginationQuerySchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const { page = 1, per_page: perPage = 10 } = c.req.valid('query') as z.infer<typeof PaginationQuerySchema>;

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/d1/database?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
    }
  ) as { result?: Array<{ uuid: string; name: string; version: string; created_at: string }>; result_info?: { total_count?: number } };

  const totalCount = data.result_info?.total_count;
  const response = createPaginationResponse(
    data.result || [],
    page,
    perPage,
    totalCount
  );
  response.message = MESSAGES.DATABASES_RETRIEVED;

  return c.json(response, HTTP_STATUS_CODES.OK);
}));

app.get("/:id", zValidator('param', DatabaseIdParamSchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const { id: databaseId } = c.req.valid('param') as z.infer<typeof DatabaseIdParamSchema>;

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/d1/database/${databaseId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
    }
  ) as { result?: { uuid: string; name: string } };

  const apiResponse: ApiResponse = {
    success: true,
    data: data.result,
    message: "D1 database retrieved successfully",
  };

  return c.json(apiResponse, HTTP_STATUS_CODES.OK);
}));

const CreateDatabaseSchema = z.object({
  name: z.string().min(1, "Database name is required")
});

app.post("/", zValidator('json', CreateDatabaseSchema), safe(async (c) => {
  const { name } = c.req.valid('json') as z.infer<typeof CreateDatabaseSchema>;
  const credentials = c.var.credentials;

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/d1/database`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    }
  ) as { result?: { uuid: string; name: string } };

  const apiResponse: ApiResponse = {
    success: true,
    data: data.result,
    message: "D1 database created successfully",
  };

  return c.json(apiResponse, HTTP_STATUS_CODES.CREATED);
}));

const ValidateQuerySchema = z.object({
  query: z.string().min(1)
});

app.post("/:id/validate-query", zValidator('param', DatabaseIdParamSchema), zValidator('json', ValidateQuerySchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const { id: databaseId } = c.req.valid('param') as z.infer<typeof DatabaseIdParamSchema>;
  const { query } = c.req.valid('json') as z.infer<typeof ValidateQuerySchema>;

  const schemaData = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      }),
    }
  ) as { result?: Array<{ results?: Array<{ name: string }> }> }; 

  const tableNames = (schemaData.result?.[0]?.results || []).map((t) => t.name.toLowerCase());

  const queryLower = query.toLowerCase();
  const validationErrors: string[] = [];
  const validationWarnings: string[] = [];

  const possibleTables = queryLower.match(/\b[a-z_][a-z0-9_]*\b/g) || [];
  
  const keywords = new Set(["select", "from", "where", "and", "or", "insert", "into", "values", "update", "set", "delete", "create", "table", "drop", "alter", "index", "join", "on", "as", "limit", "offset", "order", "by", "group", "having", "count", "sum", "avg", "min", "max", "null", "is", "not", "in", "like", "exists", "distinct", "union", "all"]);
  
  for (const word of possibleTables) {
    if (!keywords.has(word) && !tableNames.includes(word)) {
    }
  }

  if (queryLower.includes("drop table") || queryLower.includes("delete from")) {
    validationWarnings.push("Destructive operations (DROP, DELETE) detected.");
  }

  const response: ApiResponse = {
    success: true,
    data: {
      valid: validationErrors.length === 0,
      errors: validationErrors,
      warnings: validationWarnings,
      estimatedCost: 1 // Dummy cost
    },
    message: MESSAGES.QUERY_VALIDATED
  };

  return c.json(response, HTTP_STATUS_CODES.OK);
}));

const ExecuteQuerySchema = z.object({
  sql: z.string().min(1, "SQL query is required"),
  params: z.array(z.any()).optional()
});

app.post("/:id/query", zValidator('param', DatabaseIdParamSchema), zValidator('json', ExecuteQuerySchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const { id: databaseId } = c.req.valid('param') as z.infer<typeof DatabaseIdParamSchema>;
  const body = c.req.valid('json') as z.infer<typeof ExecuteQuerySchema>;

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: body.sql, params: body.params }),
    }
  ) as { result?: Array<{ results?: Array<any>; meta?: any; success: boolean }> };

  const apiResponse: ApiResponse = {
    success: true,
    data: data.result,
    message: "Query executed successfully",
  };

  return c.json(apiResponse, HTTP_STATUS_CODES.OK);
}));

app.get("/:id/schema", zValidator('param', DatabaseIdParamSchema), safe(async (c) => {
  const credentials = c.var.credentials;
  const { id: databaseId } = c.req.valid('param') as z.infer<typeof DatabaseIdParamSchema>;

  const data = await fetchCloudflare(
    `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      }),
    }
  ) as { result?: Array<{ results?: Array<{ name: string; sql: string }> }> };

  const tables = data.result?.[0]?.results || [];
  
  const apiResponse: ApiResponse = {
    success: true,
    data: {
      tables: tables.map(t => ({ name: t.name, schema: t.sql }))
    },
    message: "Database schema retrieved successfully",
  };

  return c.json(apiResponse, HTTP_STATUS_CODES.OK);
}));

export default app;
