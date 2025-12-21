"use client";

import React, { useState, useEffect } from "react";
import { ResourceSelector } from "./ResourceSelector";
import { createR2BucketConfig } from "@/config/resource-selectors";
import { SettingButton } from "@/components/ui/SettingButton";
import { SettingInput } from "@/components/ui/SettingInput";
import { apiClient } from "@/lib/api-client";
import { isSuccessResponse, getResponseError } from "@/lib/api/utils";
import type { R2Object } from "@/lib/api/types";

interface R2BucketSelectorProps {
  nodeData: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  nodeId: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function R2BucketSelector({
  nodeData,
  onNodeUpdate,
  nodeId
}: R2BucketSelectorProps) {
  const [objects, setObjects] = useState<R2Object[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("");
  const [perPage, setPerPage] = useState(25);
  const [cursor, setCursor] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const selectedBucketName = nodeData?.config?.bucket || "";

  const handleListObjects = async (useCursor?: string | null) => {
    if (!selectedBucketName) {
      setObjectError("Please select a bucket first");
      return;
    }

    setLoadingObjects(true);
    setObjectError(null);
    try {
      const currentCursor = useCursor !== undefined ? useCursor : cursor;
      const response = await apiClient.listR2Objects(
        selectedBucketName,
        prefix,
        perPage,
        currentCursor || ""
      );
      if (isSuccessResponse(response)) {
        const newObjects = response.data.objects;
        if (currentCursor) {
          setObjects((prev) => [...prev, ...newObjects]);
        } else {
          setObjects(newObjects);
        }
        setTruncated(response.data.truncated);
        setCursor(response.data.cursor);
      } else {
        setObjectError(getResponseError(response) || "Failed to list objects");
      }
    } catch (err) {
      setObjectError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingObjects(false);
    }
  };

  useEffect(() => {
    if (selectedBucketName) {
      setCursor(null);
      setObjects([]);
      handleListObjects(null);
    }
  }, [selectedBucketName]);

  const handleLoadMore = () => {
    if (cursor && truncated) {
      handleListObjects();
    }
  };

  const handleResetList = () => {
    setObjects([]);
    setCursor(null);
    setTruncated(false);
    setPrefix("");
  };

  const handleObjectClick = (objectKey: string) => {
    onNodeUpdate(nodeId, {
      config: {
        ...nodeData?.config,
        key: objectKey
      }
    });
  };

  const config = createR2BucketConfig(nodeData, onNodeUpdate, nodeId);
  const enhancedConfig = {
    ...config,
    additionalActions: [
      {
        label: "List Objects",
        onClick: handleListObjects,
        disabled: () => !selectedBucketName,
        loading: loadingObjects
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

      {selectedBucketName && (
        <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              Objects in {selectedBucketName}
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
                value={String(perPage)}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 25;
                  const clamped = Math.min(Math.max(1, val), 1000);
                  setPerPage(clamped);
                }}
                placeholder="Per page"
                className="text-xs w-20"
              />
            </div>
          </div>

          {objectError && (
            <div className="text-sm text-red-600 mb-2">{objectError}</div>
          )}

          {loadingObjects ? (
            <div className="text-sm text-gray-500">Loading objects...</div>
          ) : objects.length > 0 ? (
            <>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {objects.map((obj) => (
                  <div
                    key={obj.key}
                    onClick={() => handleObjectClick(obj.key)}
                    className="p-2 bg-white border border-gray-200 rounded cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono text-gray-900 truncate">
                          {obj.key}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatBytes(obj.size)} •{" "}
                          {new Date(obj.uploaded).toLocaleDateString()}
                        </div>
                      </div>
                      {nodeData?.config?.key === obj.key && (
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
                    disabled={loadingObjects}
                    className="w-full"
                  >
                    {loadingObjects ? "Loading..." : "Load More"}
                  </SettingButton>
                </div>
              )}
              {objects.length > 0 && (
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
              No objects found. Click "List Objects" to load.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
