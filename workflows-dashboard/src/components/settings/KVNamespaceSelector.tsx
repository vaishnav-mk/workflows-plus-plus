"use client";

import React, { useState, useEffect } from "react";
import { ResourceSelector } from "./ResourceSelector";
import { createKVNamespaceConfig } from "@/config/resource-selectors";
import { SettingButton } from "@/components/ui/SettingButton";
import { SettingInput } from "@/components/ui/SettingInput";
import { SettingSelect } from "@/components/ui/SettingSelect";
import { apiClient } from "@/lib/api-client";
import { isSuccessResponse, getResponseError } from "@/lib/api/utils";

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
  const [keys, setKeys] = useState<Array<{ key: string }>>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("");
  const [limit, setLimit] = useState(25);
  const [cursor, setCursor] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const selectedNamespaceId = nodeData?.config?.namespace_id || "";
  const selectedKey = nodeData?.config?.key || "";

  const handleListKeys = async (useCursor?: string | null) => {
    if (!selectedNamespaceId) {
      setKeyError("Please select a namespace first");
      return;
    }

    setLoadingKeys(true);
    setKeyError(null);
    try {
      const currentCursor = useCursor !== undefined ? useCursor : cursor;
      const response = await apiClient.listKVKeys(
        selectedNamespaceId,
        prefix,
        limit,
        currentCursor ? currentCursor : ""
      );
      if (isSuccessResponse(response)) {
        const newKeys = response.data.keys;
        if (currentCursor) {
          setKeys((prev) => [...prev, ...newKeys]);
        } else {
          setKeys(newKeys);
        }
        setTruncated(response.data.truncated);
        setCursor(response.data.cursor || null);
      } else {
        setKeyError(getResponseError(response) || "Failed to list keys");
      }
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleLoadMore = () => {
    if (cursor && truncated) {
      handleListKeys();
    }
  };

  const handleResetList = () => {
    setKeys([]);
    setCursor(null);
    setTruncated(false);
    setPrefix("");
  };

  const handleKeyClick = (key: string) => {
    onNodeUpdate(nodeId, {
      config: {
        ...nodeData?.config,
        key: key
      }
    });
  };

  const config = createKVNamespaceConfig();
  const enhancedConfig = {
    ...config,
    additionalActions: [
      {
        label: "List Keys",
        onClick: () => handleListKeys(null),
        disabled: () => !selectedNamespaceId,
        loading: loadingKeys
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

      {selectedNamespaceId && (
        <div className="space-y-4">
          <div>
            <SettingSelect
              label="Key"
              value={selectedKey}
              onChange={(e) => {
                onNodeUpdate(nodeId, {
                  config: {
                    ...nodeData?.config,
                    key: e.target.value
                  }
                });
              }}
              options={[
                { value: "", label: "Select a key..." },
                ...keys.map((keyItem) => ({
                  value: keyItem.key,
                  label: keyItem.key
                }))
              ]}
            />
          </div>

          <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">
                Keys in {selectedNamespaceId.slice(0, 8)}...
              </h4>
              <div className="flex gap-2 items-center">
                <SettingInput
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="Filter by prefix..."
                  className="text-xs w-32"
                />
                <SettingInput
                  type="number"
                  value={String(limit)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 25;
                    const clamped = Math.min(Math.max(1, val), 1000);
                    setLimit(clamped);
                  }}
                  placeholder="Limit"
                  className="text-xs w-20"
                />
              </div>
            </div>

            {keyError && (
              <div className="text-sm text-red-600 mb-2">{keyError}</div>
            )}

            {loadingKeys ? (
              <div className="text-sm text-gray-500">Loading keys...</div>
            ) : keys.length > 0 ? (
              <>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {keys.map((keyItem) => (
                    <div
                      key={keyItem.key}
                      onClick={() => handleKeyClick(keyItem.key)}
                      className="p-2 bg-white border border-gray-200 rounded cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-mono text-gray-900 truncate">
                            {keyItem.key}
                          </div>
                        </div>
                        {nodeData?.config?.key === keyItem.key && (
                          <div className="ml-2 text-xs text-blue-600 font-medium">
                            Selected
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {truncated && cursor && (
                  <div className="mt-2">
                    <SettingButton
                      onClick={handleLoadMore}
                      disabled={loadingKeys}
                      className="w-full"
                    >
                      {loadingKeys ? "Loading..." : "Load More"}
                    </SettingButton>
                  </div>
                )}
                {keys.length > 0 && (
                  <div className="mt-2">
                    <SettingButton
                      onClick={handleResetList}
                      className="w-full text-xs"
                    >
                      Clear List
                    </SettingButton>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                No keys found. Click "List Keys" to load.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
