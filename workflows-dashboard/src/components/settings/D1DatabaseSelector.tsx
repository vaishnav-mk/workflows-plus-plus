"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { SettingButton } from "@/components/ui/SettingButton";
import { SettingSelect } from "@/components/ui/SettingSelect";
import { SettingInput } from "@/components/ui/SettingInput";
import { SchemaViewer } from "@/components/database/SchemaViewer";

interface D1Database {
  uuid: string;
  name: string;
  created_at: string;
  version: string;
}

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
  const workflowId = searchParams.get("id");
  const [databases, setDatabases] = useState<D1Database[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>(
    nodeData?.config?.database_id || ""
  );
  const [selectedDatabaseName, setSelectedDatabaseName] = useState<string>(
    nodeData?.config?.database || ""
  );
  const [schema, setSchema] = useState<any>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Load databases on mount
  useEffect(() => {
    loadDatabases();
  }, []);

  // Update node config when selection changes
  useEffect(() => {
    if (selectedDatabaseId && selectedDatabaseName) {
      const db = databases.find((d) => d.uuid === selectedDatabaseId);
      if (db) {
        onNodeUpdate(nodeId, {
          config: {
            ...nodeData?.config,
            database_id: selectedDatabaseId,
            database: db.name
          }
        });
      }
    }
  }, [selectedDatabaseId, selectedDatabaseName, databases]);

  const loadDatabases = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getD1Databases();
      if (response.success && response.data) {
        setDatabases(response.data);
      } else {
        setError(response.error || "Failed to load databases");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDatabase = async () => {
    if (!newDatabaseName.trim()) {
      setError("Database name is required");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const response = await apiClient.createD1Database(newDatabaseName.trim());
      if (response.success && response.data) {
        const newDb = response.data;
        setDatabases([...databases, newDb]);
        setSelectedDatabaseId(newDb.uuid);
        setSelectedDatabaseName(newDb.name);
        setNewDatabaseName("");
        setShowCreateForm(false);
      } else {
        setError(response.error || "Failed to create database");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  const handleSelectDatabase = (databaseId: string) => {
    const db = databases.find((d) => d.uuid === databaseId);
    if (db) {
      setSelectedDatabaseId(databaseId);
      setSelectedDatabaseName(db.name);
    }
  };

  const handleLoadSchema = async () => {
    if (!selectedDatabaseId) {
      setError("Please select a database first");
      return;
    }

    setLoadingSchema(true);
    setError(null);
    try {
      const response = await apiClient.getD1DatabaseSchema(selectedDatabaseId);
      if (response.success && response.data) {
        setSchema(response.data);
      } else {
        setError(response.error || "Failed to load schema");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingSchema(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          D1 Database
        </label>

        {loading ? (
          <div className="text-sm text-gray-500">Loading databases...</div>
        ) : (
          <>
            <SettingSelect
              value={selectedDatabaseId}
              onChange={(e) => handleSelectDatabase(e.target.value)}
              options={[
                { value: "", label: "Select a database..." },
                ...databases.map((db) => ({
                  value: db.uuid,
                  label: `${db.name} (${db.uuid.slice(0, 8)}...)`
                }))
              ]}
            />

            {selectedDatabaseId && (
              <div className="mt-2 text-xs text-gray-500">
                Selected: {selectedDatabaseName}
              </div>
            )}
          </>
        )}

        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>

      {selectedDatabaseId && (
        <div className="mb-3">
          <a
            href={`/databases/${selectedDatabaseId}?${(() => {
              // Preserve all existing URL parameters
              const params = new URLSearchParams(searchParams.toString());
              params.set("returnToBuilder", "true");
              params.set("returnNodeId", nodeId);
              if (workflowId) {
                params.set("workflowId", workflowId);
              }
              return params.toString();
            })()}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SettingButton className="bg-blue-600 hover:bg-blue-700 text-white">
              Open Database Manager
            </SettingButton>
          </a>
        </div>
      )}

      <div className="flex gap-2">
        <SettingButton onClick={loadDatabases} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </SettingButton>

        <SettingButton onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? "Cancel" : "+ Create Database"}
        </SettingButton>

        {selectedDatabaseId && (
          <SettingButton onClick={handleLoadSchema} disabled={loadingSchema}>
            {loadingSchema ? "Loading..." : "Get Schema"}
          </SettingButton>
        )}
      </div>

      {showCreateForm && (
        <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Database Name
          </label>
          <div className="flex gap-2">
            <SettingInput
              value={newDatabaseName}
              onChange={(e) => setNewDatabaseName(e.target.value)}
              placeholder="my-database"
              className="flex-1"
            />
            <SettingButton
              onClick={handleCreateDatabase}
              disabled={creating || !newDatabaseName.trim()}
            >
              {creating ? "Creating..." : "Create"}
            </SettingButton>
          </div>
        </div>
      )}

      {schema && schema.tables && (
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
