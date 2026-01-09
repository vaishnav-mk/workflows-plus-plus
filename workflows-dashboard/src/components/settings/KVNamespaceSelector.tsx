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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key
            </label>
            <SettingInput
              value={selectedKey}
              onChange={(e) => {
                onNodeUpdate(nodeId, {
                  config: {
                    ...nodeData?.config,
                    key: e.target.value
                  }
                });
              }}
              placeholder="Enter key name or select from list below"
              className="font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              Type a custom key or click one from the list below
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-200">
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Browse Keys
              </h4>
              <div className="flex gap-1.5 items-center">
                <SettingInput
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="Prefix filter..."
                  className="text-xs w-28"
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
                  className="text-xs w-14"
                />
              </div>
            </div>

            {keyError && (
              <div className="text-xs text-red-600 p-2.5 bg-red-50 border border-red-200 rounded-md">
                {keyError}
              </div>
            )}

            {loadingKeys ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-orange-500 mb-2"></div>
                <div className="text-xs">Loading keys...</div>
              </div>
            ) : keys.length > 0 ? (
              <>
                <div className="max-h-60 overflow-y-auto space-y-1 p-1">
                  {keys.map((keyItem) => (
                    <button
                      key={keyItem.key}
                      onClick={() => handleKeyClick(keyItem.key)}
                      className={`w-full p-2 text-left rounded transition-all ${
                        nodeData?.config?.key === keyItem.key
                          ? "bg-orange-50 border border-orange-200 shadow-sm"
                          : "bg-white border border-gray-200 hover:border-orange-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono text-gray-900 truncate">
                            {keyItem.key}
                          </div>
                        </div>
                        {nodeData?.config?.key === keyItem.key && (
                          <div className="flex-shrink-0 text-[10px] text-orange-600 font-semibold bg-orange-100 px-1.5 py-0.5 rounded">
                            SELECTED
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  {truncated && cursor && (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingKeys}
                      style={{
                        backgroundColor: loadingKeys ? '#D1D5DB' : '#EA580C',
                        color: 'white',
                      }}
                      className="flex-1 h-8 px-3 text-xs font-medium rounded-lg hover:opacity-90 disabled:cursor-not-allowed transition-opacity shadow-sm"
                    >
                      {loadingKeys ? "Loading..." : "Load More"}
                    </button>
                  )}
                  <button
                    onClick={handleResetList}
                    className={`${truncated && cursor ? "flex-1" : "w-full"} h-8 px-3 text-xs font-medium rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm`}
                  >
                    Clear List
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <div className="text-xs text-center">
                  <div className="mb-1">No keys loaded</div>
                  <div className="text-[10px] text-gray-400">
                    Click "List Keys" above to browse
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
