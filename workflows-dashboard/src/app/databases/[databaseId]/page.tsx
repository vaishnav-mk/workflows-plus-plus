"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { isSuccessResponse, getResponseError } from "@/lib/api/utils";
import type { D1Database, D1DatabaseSchema, D1Table } from "@/lib/api/types";
import { Card, CardContent, PageHeader, Button } from "@/components";
import { InlineLoader } from "@/components/ui/Loader";
import { Table, Play } from "lucide-react";
import { QueryResultTable } from "@/components/database/QueryResultTable";
import { SchemaViewer } from "@/components/database/SchemaViewer";

function DatabaseDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const databaseId = params.databaseId as string;
  const returnToBuilder = searchParams.get("returnToBuilder") === "true";
  const returnNodeId = searchParams.get("returnNodeId");
  const workflowId = searchParams.get("workflowId");

  // Store original builder URL parameters when page loads
  const [originalBuilderParams, setOriginalBuilderParams] =
    useState<URLSearchParams | null>(null);

  const [database, setDatabase] = useState<D1Database | null>(null);
  const [tables, setTables] = useState<D1Table[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [executingQuery, setExecutingQuery] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Store original builder params on mount
  useEffect(() => {
    if (returnToBuilder && searchParams) {
      // Store all params that came from the builder (preserve type, template_type, etc.)
      const builderParams = new URLSearchParams();
      // Copy all params that look like builder params
      for (const [key, value] of searchParams.entries()) {
        // Preserve all params except the return-specific ones (we'll add those back when constructing return URL)
        if (!["returnToBuilder", "returnNodeId", "workflowId"].includes(key)) {
          builderParams.set(key, value);
        }
      }
      // Also ensure we have the workflow ID
      if (workflowId) {
        builderParams.set("id", workflowId);
      }
      setOriginalBuilderParams(builderParams);
      console.log("[DatabaseDetailPage] Stored original builder params", {
        params: Array.from(builderParams.entries()),
        allIncomingParams: Array.from(searchParams.entries())
      });
    }
  }, [returnToBuilder, searchParams, workflowId]);

  useEffect(() => {
    if (databaseId) {
      loadDatabase();
      loadSchema();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId]);

  const loadDatabase = async () => {
    try {
      const response = await apiClient.getD1Database(databaseId);
      if (isSuccessResponse(response)) {
        setDatabase(response.data);
      } else {
        setError(getResponseError(response) || "Failed to load database");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const loadSchema = async () => {
    setLoadingSchema(true);
    setError(null);
    try {
      const response = await apiClient.getD1DatabaseSchema(databaseId);
      if (isSuccessResponse(response)) {
        setTables(response.data.tables);
      } else {
        setError(getResponseError(response) || "Failed to load schema");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }

    setExecutingQuery(true);
    setError(null);
    try {
      const response = await apiClient.executeD1Query(databaseId, query);
      if (isSuccessResponse(response)) {
        setQueryResult(response.data);
      } else {
        setError(getResponseError(response) || "Failed to execute query");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setExecutingQuery(false);
    }
  };

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    setQuery(`SELECT * FROM ${tableName} LIMIT 10`);
  };

  // Build the return to builder link URL
  const returnToBuilderUrl = useMemo(() => {
    console.log("[DatabaseDetailPage] Building return URL", {
      returnNodeId,
      query: query?.substring(0, 50),
      queryLength: query?.length,
      workflowId,
      databaseId,
      databaseName: database?.name,
      hasQuery: !!query?.trim(),
      hasOriginalBuilderParams: !!originalBuilderParams,
      originalBuilderParamsArray: originalBuilderParams
        ? Array.from(originalBuilderParams.entries())
        : null,
      currentSearchParams: searchParams.toString(),
      allSearchParams: Array.from(searchParams.entries())
    });

    if (!returnNodeId || !query.trim()) {
      console.warn(
        "[DatabaseDetailPage] Missing required params for return URL",
        {
          returnNodeId,
          hasQuery: !!query?.trim(),
          queryValue: query
        }
      );
      return null;
    }

    // Start with original builder params if we have them, otherwise use current search params
    const queryParams = originalBuilderParams
      ? new URLSearchParams(originalBuilderParams.toString())
      : new URLSearchParams(searchParams.toString());

    const originalParamsArray = Array.from(queryParams.entries());
    console.log("[DatabaseDetailPage] Base params for return URL", {
      usingOriginalParams: !!originalBuilderParams,
      originalParams: originalParamsArray,
      paramCount: originalParamsArray.length
    });

    // Add/update return parameters
    queryParams.set("returnNodeId", returnNodeId);
    queryParams.set("database_id", databaseId);
    queryParams.set("database", database?.name || "");
    queryParams.set("query", query);
    queryParams.set("returnToBuilder", "true");

    // Ensure workflow ID is set if we have it
    if (workflowId) {
      queryParams.set("id", workflowId);
    }

    const finalUrl = `/builder?${queryParams.toString()}`;
    const finalParams = Array.from(queryParams.entries());
    console.log("[DatabaseDetailPage] Final return URL constructed", {
      url: finalUrl,
      urlLength: finalUrl.length,
      urlPreview:
        finalUrl.substring(0, 200) + (finalUrl.length > 200 ? "..." : ""),
      params: finalParams,
      paramCount: finalParams.length,
      hasReturnNodeId: queryParams.has("returnNodeId"),
      hasDatabaseId: queryParams.has("database_id"),
      hasQuery: queryParams.has("query"),
      hasDatabase: queryParams.has("database"),
      hasType: queryParams.has("type"),
      hasTemplateType: queryParams.has("template_type"),
      hasId: queryParams.has("id")
    });

    return finalUrl;
  }, [
    returnNodeId,
    query,
    workflowId,
    databaseId,
    database?.name,
    originalBuilderParams,
    searchParams
  ]);

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-6 py-12">
        <div className="flex items-center gap-4 mb-6">
          <PageHeader
            title={database?.name || "Database"}
            description={`Database ID: ${databaseId}`}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Schema/Tables Panel */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Table className="w-5 h-5" />
                  Tables
                </h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadSchema}
                  disabled={loadingSchema}
                >
                  {loadingSchema ? "Loading..." : "Refresh"}
                </Button>
              </div>

              {loadingSchema ? (
                <div className="flex items-center justify-center py-12">
                  <InlineLoader text="Loading schema..." />
                </div>
              ) : (
                <SchemaViewer
                  tables={tables}
                  onTableSelect={handleSelectTable}
                  selectedTable={selectedTable}
                />
              )}
            </CardContent>
          </Card>

          {/* Query Panel */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Query Database
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SQL Query
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="SELECT * FROM table_name LIMIT 10"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    rows={8}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleExecuteQuery}
                    disabled={executingQuery || !query.trim()}
                  >
                    {executingQuery ? "Executing..." : "Execute Query"}
                  </Button>
                  {returnToBuilder && returnNodeId && returnToBuilderUrl && (
                    <Link
                      href={returnToBuilderUrl}
                      onClick={(_e) => {
                        console.log(
                          "[DatabaseDetailPage] Return to Builder link clicked",
                          {
                            href: returnToBuilderUrl,
                            query: query.substring(0, 50),
                            returnNodeId,
                            databaseId,
                            databaseName: database?.name
                          }
                        );
                      }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!query.trim()}
                        title={
                          workflowId
                            ? `Workflow: ${workflowId}, Node: ${returnNodeId}`
                            : `Node: ${returnNodeId}`
                        }
                      >
                        Return to Builder
                        {workflowId && (
                          <span className="ml-2 text-xs opacity-75">
                            ({workflowId.slice(0, 8)}... /{" "}
                            {returnNodeId.slice(0, 8)}...)
                          </span>
                        )}
                      </Button>
                    </Link>
                  )}
                </div>

                {queryResult && (
                  <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Query Result
                    </h3>
                    {queryResult.results &&
                    Array.isArray(queryResult.results) &&
                    queryResult.results.length > 0 ? (
                      <QueryResultTable
                        results={queryResult.results}
                        meta={queryResult.meta}
                      />
                    ) : queryResult.success === false ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                        Query failed: {queryResult.error || "Unknown error"}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No results returned
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DatabaseDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <InlineLoader text="Loading..." />
        </div>
      }
    >
      <DatabaseDetailContent />
    </Suspense>
  );
}
