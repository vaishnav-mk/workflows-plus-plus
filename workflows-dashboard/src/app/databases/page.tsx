"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { isSuccessResponse, getResponseError } from "@/lib/api/utils";
import type { D1Database } from "@/lib/api/types";
import { PageHeader, Button, CrossHatchBackground } from "@/components";
import { InlineLoader } from "@/components/ui/Loader";
import { Database, Plus } from "lucide-react";

export default function DatabasesPage() {
  const router = useRouter();
  const [databases, setDatabases] = useState<D1Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getD1Databases();
      if (isSuccessResponse(response)) {
        setDatabases(response.data);
      } else {
        setError(getResponseError(response) || "Failed to load databases");
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
      if (isSuccessResponse(response)) {
        await loadDatabases();
        setNewDatabaseName("");
        setShowCreateForm(false);
      } else {
        setError(getResponseError(response) || "Failed to create database");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  const handleDatabaseClick = (databaseId: string) => {
    router.push(`/databases/${databaseId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      <CrossHatchBackground pattern="large" />
      <div className="relative z-10 w-full px-6 py-8">
        <PageHeader
          title="D1 Databases"
          description="Manage your Cloudflare D1 databases"
        />

        <div className="mt-4">
          <div className="border border-gray-200 rounded-md bg-white">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  Databases
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={loadDatabases}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Database
                  </Button>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {error}
                </div>
              )}

              {showCreateForm && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Database Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDatabaseName}
                      onChange={(e) => setNewDatabaseName(e.target.value)}
                      placeholder="my-database"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCreateDatabase}
                      disabled={creating || !newDatabaseName.trim()}
                    >
                      {creating ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <InlineLoader text="Loading databases..." />
                </div>
              ) : databases.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No databases found. Create your first database to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {databases.map((db) => (
                    <button
                      key={db.uuid}
                      onClick={() => handleDatabaseClick(db.uuid)}
                      className="p-3 border border-gray-200 rounded-md bg-white hover:border-orange-300 hover:bg-orange-50/20 cursor-pointer transition-all text-left"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-indigo-50 rounded flex-shrink-0">
                          <Database className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {db.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">
                            {db.uuid.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(db.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
