"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ResourceSelector } from "./ResourceSelector";
import { createD1DatabaseConfig } from "@/config/resource-selectors";
import { SettingButton } from "@/components/ui/SettingButton";
import { apiClient } from "@/lib/api-client";
import { isSuccessResponse, getResponseError } from "@/lib/api/utils";
import { SchemaViewer } from "@/components/database/SchemaViewer";

interface D1DatabaseSelectorProps {
  nodeData: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  nodeId: string;
}

export function D1DatabaseSelector({
  nodeData,
  onNodeUpdate,
  nodeId
}: D1DatabaseSelectorProps) {
  const searchParams = useSearchParams();
  const [schema, setSchema] = useState<any>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const selectedDatabaseId = nodeData?.config?.database_id || "";

  const handleLoadSchema = async () => {
    if (!selectedDatabaseId) {
      setSchemaError("Please select a database first");
      return;
    }

    setLoadingSchema(true);
    setSchemaError(null);
    try {
      const response = await apiClient.getD1DatabaseSchema(selectedDatabaseId);
      if (isSuccessResponse(response)) {
        setSchema(response.data);
      } else {
        setSchemaError(getResponseError(response) || "Failed to load schema");
      }
    } catch (err) {
      setSchemaError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingSchema(false);
    }
  };

  const config = createD1DatabaseConfig(nodeId, searchParams);
  const enhancedConfig = {
    ...config,
    additionalActions: [
      {
        label: "Get Schema",
        onClick: handleLoadSchema,
        disabled: () => !selectedDatabaseId,
        loading: loadingSchema
      }
    ]
  };

  return (
    <div className="space-y-4">
      <ResourceSelector 
        nodeData={nodeData} 
        onNodeUpdate={onNodeUpdate} 
        nodeId={nodeId} 
        config={enhancedConfig} 
      />
      {schemaError && (
        <div className="text-sm text-red-600">{schemaError}</div>
      )}
      {schema && schema.tables && selectedDatabaseId && (
        <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Database Schema
          </h4>
          <SchemaViewer tables={schema.tables} />
          {schema.meta && (
            <div className="mt-3 text-xs text-gray-500">
              <div>Duration: {schema.meta.duration}ms</div>
              <div>Region: {schema.meta.served_by_region}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
