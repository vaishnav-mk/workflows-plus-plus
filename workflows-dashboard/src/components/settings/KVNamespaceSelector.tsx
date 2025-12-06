"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { SettingButton } from "@/components/ui/SettingButton";
import { SettingSelect } from "@/components/ui/SettingSelect";
import { SettingInput } from "@/components/ui/SettingInput";

interface KVNamespace {
  id: string;
  title: string;
}

interface KVNamespaceSelectorProps {
  nodeData: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  nodeId: string;
}

export function KVNamespaceSelector({
  nodeData,
  onNodeUpdate,
  nodeId
}: KVNamespaceSelectorProps) {
  const searchParams = useSearchParams();
  const workflowId = searchParams.get("id");
  const [namespaces, setNamespaces] = useState<KVNamespace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNamespaceTitle, setNewNamespaceTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedNamespaceId, setSelectedNamespaceId] = useState<string>(
    nodeData?.config?.namespace_id || ""
  );
  const [selectedNamespaceTitle, setSelectedNamespaceTitle] = useState<string>(
    nodeData?.config?.namespace || ""
  );

  // Load namespaces on mount
  useEffect(() => {
    loadNamespaces();
  }, []);

  // Update node config when selection changes
  useEffect(() => {
    if (selectedNamespaceId && selectedNamespaceTitle) {
      const ns = namespaces.find((n) => n.id === selectedNamespaceId);
      if (ns) {
        onNodeUpdate(nodeId, {
          config: {
            ...nodeData?.config,
            namespace_id: selectedNamespaceId,
            namespace: ns.title
          }
        });
      }
    }
  }, [selectedNamespaceId, selectedNamespaceTitle, namespaces]);

  const loadNamespaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getKVNamespaces();
      if (response.success && response.data) {
        setNamespaces(response.data);
      } else {
        setError(response.error || "Failed to load namespaces");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNamespace = async () => {
    if (!newNamespaceTitle.trim()) {
      setError("Namespace title is required");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const response = await apiClient.createKVNamespace(newNamespaceTitle.trim());
      if (response.success && response.data) {
        const newNs = response.data;
        setNamespaces([...namespaces, newNs]);
        setSelectedNamespaceId(newNs.id);
        setSelectedNamespaceTitle(newNs.title);
        setNewNamespaceTitle("");
        setShowCreateForm(false);
      } else {
        setError(response.error || "Failed to create namespace");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  const handleSelectNamespace = (namespaceId: string) => {
    const ns = namespaces.find((n) => n.id === namespaceId);
    if (ns) {
      setSelectedNamespaceId(namespaceId);
      setSelectedNamespaceTitle(ns.title);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          KV Namespace
        </label>

        {loading ? (
          <div className="text-sm text-gray-500">Loading namespaces...</div>
        ) : (
          <>
            <SettingSelect
              value={selectedNamespaceId}
              onChange={(e) => handleSelectNamespace(e.target.value)}
              options={[
                { value: "", label: "Select a namespace..." },
                ...namespaces.map((ns) => ({
                  value: ns.id,
                  label: `${ns.title} (${ns.id.slice(0, 8)}...)`
                }))
              ]}
            />

            {selectedNamespaceId && (
              <div className="mt-2 text-xs text-gray-500">
                Selected: {selectedNamespaceTitle}
              </div>
            )}
          </>
        )}

        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>

      <div className="flex gap-2">
        <SettingButton onClick={loadNamespaces} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </SettingButton>

        <SettingButton onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? "Cancel" : "+ Create Namespace"}
        </SettingButton>
      </div>

      {showCreateForm && (
        <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Namespace Title
          </label>
          <div className="flex gap-2">
            <SettingInput
              value={newNamespaceTitle}
              onChange={(e) => setNewNamespaceTitle(e.target.value)}
              placeholder="my-kv-namespace"
              className="flex-1"
            />
            <SettingButton
              onClick={handleCreateNamespace}
              disabled={creating || !newNamespaceTitle.trim()}
            >
              {creating ? "Creating..." : "Create"}
            </SettingButton>
          </div>
        </div>
      )}
    </div>
  );
}

