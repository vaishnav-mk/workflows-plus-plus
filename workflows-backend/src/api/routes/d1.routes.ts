/**
 * D1 Database Routes
 */

import { Hono } from "hono";
import { HTTP_STATUS_CODES } from "../../core/constants";
import { ErrorCode } from "../../core/enums";
import { ApiResponse } from "../../core/api-contracts";
import { createPaginationResponse } from "../../core/utils/pagination";
import { CredentialsContext } from "../../api/middleware/credentials.middleware";
import { validateQuery, validateParams, validationErrorResponse } from "../../core/validation/validator";
import { PaginationQuerySchema } from "../../core/validation/schemas";
import { z } from "zod";
import { CLOUDFLARE } from "../../core/constants";
import { logger } from "../../core/logging/logger";

interface ContextWithCredentials {
  Variables: {
    credentials: CredentialsContext;
  };
}

const DatabaseIdParamSchema = z.object({
  id: z.string().uuid(),
});

const CreateDatabaseSchema = z.object({
  name: z.string().min(1).max(100),
});

const app = new Hono<ContextWithCredentials>();

// List D1 databases
app.get("/", async (c) => {
  try {
    const queryValidation = validateQuery(c, PaginationQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }
    
    const credentials = c.var.credentials;
    const page = queryValidation.data.page || 1;
    const perPage = queryValidation.data.per_page || 1000;
    const name = c.req.query("name");

    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (name) params.append("name", name);
    console.log(params.toString());

    const response = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/d1/database?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText) as { message?: string; errors?: Array<{ message?: string }> };
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      
      logger.error("Cloudflare API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    const data = await response.json() as { result?: Array<{ uuid: string; name: string }>; result_info?: { total_count?: number } };
    const totalCount = data.result_info?.total_count;
    const apiResponse = createPaginationResponse(
      data.result || [],
      page,
      perPage,
      totalCount
    );
    apiResponse.message = "D1 databases retrieved successfully";

    return c.json(apiResponse, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to fetch D1 databases",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Get D1 database by ID
app.get("/:id", async (c) => {
  try {
    const paramsValidation = validateParams(c, DatabaseIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const credentials = c.var.credentials;
    const { id: databaseId } = paramsValidation.data;

    const response = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/d1/database/${databaseId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText) as { message?: string; errors?: Array<{ message?: string }> };
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      
      logger.error("Cloudflare API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    const data = await response.json() as { result?: { uuid: string; name: string } };
    console.log(data);
    const apiResponse: ApiResponse = {
      success: true,
      data: data.result,
      message: "D1 database retrieved successfully",
    };

    return c.json(apiResponse, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to get D1 database",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Create D1 database
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validation = CreateDatabaseSchema.safeParse(body);
    
    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: validation.error.errors[0]?.message || "Invalid request body",
          code: ErrorCode.VALIDATION_ERROR,
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const credentials = c.var.credentials;
    const response = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/d1/database`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: validation.data.name }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText) as { message?: string; errors?: Array<{ message?: string }> };
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      
      logger.error("Cloudflare API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    const data = await response.json() as { result?: { uuid: string; name: string } };
    const apiResponse: ApiResponse = {
      success: true,
      data: data.result,
      message: "D1 database created successfully",
    };

    return c.json(apiResponse, HTTP_STATUS_CODES.CREATED);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to create D1 database",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Validate D1 query
app.post("/:id/validate-query", async (c) => {
  try {
    const paramsValidation = validateParams(c, DatabaseIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const body = await c.req.json();
    const queryValidation = z.object({
      query: z.string().min(1),
    }).safeParse(body);
    
    if (!queryValidation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: queryValidation.error.errors[0]?.message || "Invalid request body",
          code: ErrorCode.VALIDATION_ERROR,
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    
    const credentials = c.var.credentials;
    const { id: databaseId } = paramsValidation.data;
    const { query } = queryValidation.data;

    // First get schema to extract table names
    const schemaResponse = await fetch(
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
    );

    if (!schemaResponse.ok) {
      const errorText = await schemaResponse.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${schemaResponse.status}` };
      }
      throw new Error(errorData.message || `HTTP ${schemaResponse.status}`);
    }

    const schemaData = await schemaResponse.json() as { result?: { results?: Array<{ name: string }> } };
    const tableNames = (schemaData.result?.results || []).map((t) => t.name.toLowerCase());

    // Try to validate query by checking if it references valid tables
    const queryLower = query.toLowerCase();
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // Extract table names from query (simple regex-based extraction)
    const tableMatches = queryLower.match(/\b(from|join|into|update)\s+([a-z_][a-z0-9_]*)/gi);
    if (tableMatches) {
      tableMatches.forEach((match) => {
        const parts = match.split(/\s+/);
        if (parts.length > 1) {
          const tableName = parts[parts.length - 1].toLowerCase();
          if (!tableNames.includes(tableName) && !tableName.startsWith('sqlite_')) {
            validationWarnings.push(`Table "${parts[parts.length - 1]}" may not exist in the database`);
          }
        }
      });
    }

    // Try to execute query with EXPLAIN to validate syntax
    let syntaxValid = true;
    let syntaxError: string | null = null;
    try {
      const explainResponse = await fetch(
        `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/d1/database/${databaseId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${credentials.apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sql: `EXPLAIN QUERY PLAN ${query}`,
          }),
        }
      );

      if (!explainResponse.ok) {
        const errorText = await explainResponse.text();
        let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
        try {
          errorData = JSON.parse(errorText) as { message?: string; errors?: Array<{ message?: string }> };
        } catch {
          errorData = { message: errorText || `HTTP ${explainResponse.status}` };
        }
        syntaxValid = false;
        syntaxError = errorData.message || errorData.errors?.[0]?.message || "Query syntax error";
      }
    } catch (error) {
      syntaxValid = false;
      syntaxError = error instanceof Error ? error.message : "Unknown error";
    }

    const apiResponse: ApiResponse = {
      success: true,
      data: {
        valid: syntaxValid && validationErrors.length === 0,
        errors: validationErrors,
        warnings: validationWarnings,
        syntaxError,
        availableTables: tableNames,
      },
      message: syntaxValid ? "Query is valid" : "Query validation failed",
    };

    return c.json(apiResponse, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to validate query",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Execute D1 query
app.post("/:id/query", async (c) => {
  try {
    const paramsValidation = validateParams(c, DatabaseIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const body = await c.req.json();
    const queryValidation = z.object({
      sql: z.string().min(1),
    }).safeParse(body);
    
    if (!queryValidation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          message: queryValidation.error.errors[0]?.message || "Invalid request body",
          code: ErrorCode.VALIDATION_ERROR,
        },
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    
    const credentials = c.var.credentials;
    const { id: databaseId } = paramsValidation.data;
    const { sql } = queryValidation.data;

    const response = await fetch(
      `${CLOUDFLARE.API_BASE}/accounts/${credentials.accountId}/d1/database/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText) as { message?: string; errors?: Array<{ message?: string }> };
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      
      logger.error("Cloudflare API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    const data = await response.json() as { 
      result?: any; 
      meta?: any; 
      success?: boolean;
      results?: any[];
    };
    
    // Parse results - Cloudflare API can return results in different formats:
    // 1. data.result as array of objects (direct query results)
    // 2. data.result.results as array (nested structure)
    // 3. data.results as array (top-level)
    // 4. data.result as single object with results property
    // 5. data.result[0].results as array (array of result objects, first has results)
    let parsedResults: any[] = [];
    let extractedMeta: any = undefined;
    
    if (Array.isArray(data.result)) {
      // Check if first element has nested results array
      if (data.result.length > 0 && 
          data.result[0] && 
          typeof data.result[0] === 'object' && 
          'results' in data.result[0] && 
          Array.isArray(data.result[0].results)) {
        // Extract nested results array from first element
        parsedResults = data.result[0].results;
        extractedMeta = data.result[0].meta || data.meta;
      } else {
        // Direct array of results
        parsedResults = data.result;
        extractedMeta = data.meta;
      }
    } else if (Array.isArray(data.results)) {
      // Top-level results array
      parsedResults = data.results;
      extractedMeta = data.meta;
    } else if (data.result && typeof data.result === 'object') {
      if (Array.isArray(data.result.results)) {
        // Nested results array
        parsedResults = data.result.results;
        extractedMeta = data.result.meta || data.meta;
      } else if (Array.isArray(data.result)) {
        parsedResults = data.result;
        extractedMeta = data.meta;
      } else {
        // Single result object - check if it has results property
        if ('results' in data.result && Array.isArray(data.result.results)) {
          parsedResults = data.result.results;
          extractedMeta = data.result.meta || data.meta;
        } else {
          // Single result object - wrap in array
          parsedResults = [data.result];
          extractedMeta = data.meta;
        }
      }
    }
    
    // Ensure meta is properly extracted
    const meta = extractedMeta || data.meta;
    
    const apiResponse: ApiResponse = {
      success: true,
      data: {
        results: parsedResults,
        meta: meta,
        success: data.success !== false,
      },
      message: "Query executed successfully",
    };

    return c.json(apiResponse, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to execute query",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Get D1 database schema
app.get("/:id/schema", async (c) => {
  try {
    const paramsValidation = validateParams(c, DatabaseIdParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const credentials = c.var.credentials;
    const { id: databaseId } = paramsValidation.data;

    // Query the database to get schema information
    // We'll use a query that returns table information
    const response = await fetch(
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
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { message?: string; errors?: Array<{ message?: string }> } = {};
      try {
        errorData = JSON.parse(errorText) as { message?: string; errors?: Array<{ message?: string }> };
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      
      logger.error("Cloudflare API error", new Error(errorData.message || `HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(errorData.message || errorData.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    const data = await response.json() as { result?: Array<{ results?: Array<{ name: string; sql: string }> }> | { results?: Array<{ name: string; sql: string }> }; meta?: any };
    
    // Parse the response structure - Cloudflare API can return results in different formats
    let tables: Array<{ name: string; sql: string }> = [];
    
    if (Array.isArray(data.result)) {
      // If result is an array, get results from first element
      tables = (data.result[0]?.results || []).map((table) => ({
        name: table.name,
        sql: table.sql,
      }));
    } else if (data.result && typeof data.result === 'object' && 'results' in data.result) {
      // If result is an object with results property
      tables = ((data.result as { results?: Array<{ name: string; sql: string }> }).results || []).map((table) => ({
        name: table.name,
        sql: table.sql,
      }));
    }

    const apiResponse: ApiResponse = {
      success: true,
      data: {
        tables,
        meta: data.meta,
      },
      message: "D1 database schema retrieved successfully",
    };

    return c.json(apiResponse, HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to get D1 database schema",
        message: error instanceof Error ? error.message : "Unknown error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;

