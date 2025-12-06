"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { SettingButton } from "@/components/ui/SettingButton";
import { SettingSelect } from "@/components/ui/SettingSelect";
import { SettingInput } from "@/components/ui/SettingInput";

interface R2Bucket {
  name: string;
  creation_date?: string;
  location?: string;
}

interface R2Object {
  key: string;
  size: number;
  etag: string;
  uploaded: string;
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
  storageClass?: string;
}

interface R2BucketSelectorProps {
  nodeData: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  nodeId: string;
}

export function R2BucketSelector({
  nodeData,
  onNodeUpdate,
  nodeId
}: R2BucketSelectorProps) {
  const searchParams = useSearchParams();
  const workflowId = searchParams.get("id");
  const [buckets, setBuckets] = useState<R2Bucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedBucketName, setSelectedBucketName] = useState<string>(
    nodeData?.config?.bucket || ""
  );
  const [objects, setObjects] = useState<R2Object[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [perPage, setPerPage] = useState(25);
  const [cursor, setCursor] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  // Load buckets on mount
  useEffect(() => {
    loadBuckets();
  }, []);

  // Update node config when selection changes
  useEffect(() => {
    if (selectedBucketName) {
      const bucket = buckets.find((b) => b.name === selectedBucketName);
      if (bucket) {
        onNodeUpdate(nodeId, {
          config: {
            ...nodeData?.config,
            bucket: bucket.name
          }
        });
      }
    }
  }, [selectedBucketName, buckets]);

  const loadBuckets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getR2Buckets();
      if (response.success && response.data) {
        // Handle paginated response - data might be an array directly or nested
        let bucketsData: R2Bucket[] = [];
        if (Array.isArray(response.data)) {
          bucketsData = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // Check if data has a buckets property (nested structure)
          if ('buckets' in response.data && Array.isArray((response.data as any).buckets)) {
            bucketsData = (response.data as any).buckets;
          } else if (Array.isArray((response.data as any).data)) {
            bucketsData = (response.data as any).data;
          }
        }
        setBuckets(bucketsData);
      } else {
        setError(response.error || "Failed to load buckets");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBucket = async () => {
    if (!newBucketName.trim()) {
      setError("Bucket name is required");
      return;
    }

    // Validate bucket name: lowercase alphanumeric and hyphens, 3-63 chars
    const bucketNameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (newBucketName.length < 3 || newBucketName.length > 63) {
      setError("Bucket name must be between 3 and 63 characters");
      return;
    }
    if (!bucketNameRegex.test(newBucketName)) {
      setError("Bucket name must be lowercase alphanumeric with hyphens, and start/end with alphanumeric");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const response = await apiClient.createR2Bucket(newBucketName.trim());
      if (response.success && response.data) {
        const newBucket = response.data;
        setBuckets([...buckets, newBucket]);
        setSelectedBucketName(newBucket.name);
        setNewBucketName("");
        setShowCreateForm(false);
      } else {
        setError(response.error || "Failed to create bucket");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  const handleSelectBucket = (bucketName: string) => {
    const bucket = buckets.find((b) => b.name === bucketName);
    if (bucket) {
      setSelectedBucketName(bucketName);
      setObjects([]); // Clear objects when bucket changes
      setCursor(null); // Reset cursor when bucket changes
      setTruncated(false);
    }
  };

  const handleListObjects = async () => {
    if (!selectedBucketName) {
      setError("Please select a bucket first");
      return;
    }

    setLoadingObjects(true);
    setError(null);
    try {
      const response = await apiClient.listR2Objects(selectedBucketName, prefix, perPage, cursor || undefined);
      if (response.success && response.data) {
        const newObjects = response.data.objects || [];
        if (cursor) {
          // Append to existing objects for pagination
          setObjects([...objects, ...newObjects]);
        } else {
          // Replace objects for new search
          setObjects(newObjects);
        }
        setTruncated(response.data.truncated || false);
        setCursor(response.data.cursor || null);
      } else {
        setError(response.error || "Failed to list objects");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingObjects(false);
    }
  };

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
    // Update the node config with the selected object key
    onNodeUpdate(nodeId, {
      config: {
        ...nodeData?.config,
        key: objectKey
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          R2 Bucket
        </label>

        {loading ? (
          <div className="text-sm text-gray-500">Loading buckets...</div>
        ) : (
          <>
            <SettingSelect
              value={selectedBucketName}
              onChange={(e) => handleSelectBucket(e.target.value)}
              options={[
                { value: "", label: "Select a bucket..." },
                ...buckets.map((bucket) => ({
                  value: bucket.name,
                  label: bucket.name
                }))
              ]}
            />

            {selectedBucketName && (
              <div className="mt-2 text-xs text-gray-500">
                Selected: {selectedBucketName}
              </div>
            )}
          </>
        )}

        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <SettingButton onClick={loadBuckets} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </SettingButton>

        <SettingButton onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? "Cancel" : "+ Create Bucket"}
        </SettingButton>

        {selectedBucketName && (
          <SettingButton onClick={handleListObjects} disabled={loadingObjects}>
            {loadingObjects ? "Loading..." : "List Objects"}
          </SettingButton>
        )}
      </div>

      {showCreateForm && (
        <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Bucket Name
          </label>
          <div className="flex gap-2">
            <SettingInput
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value.toLowerCase())}
              placeholder="my-bucket-name"
              className="flex-1"
            />
            <SettingButton
              onClick={handleCreateBucket}
              disabled={creating || !newBucketName.trim()}
            >
              {creating ? "Creating..." : "Create"}
            </SettingButton>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Bucket names must be 3-63 characters, lowercase alphanumeric with hyphens
          </p>
        </div>
      )}

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
                          {formatBytes(obj.size)} • {new Date(obj.uploaded).toLocaleDateString()}
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
                  <SettingButton onClick={handleLoadMore} disabled={loadingObjects} className="w-full">
                    {loadingObjects ? "Loading..." : "Load More"}
                  </SettingButton>
                </div>
              )}
              {objects.length > 0 && (
                <div className="mt-2">
                  <SettingButton onClick={handleResetList} className="w-full text-xs">
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

