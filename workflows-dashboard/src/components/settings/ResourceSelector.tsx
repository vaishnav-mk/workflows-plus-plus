"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SettingButton } from "@/components/ui/SettingButton";
import { SettingSelect } from "@/components/ui/SettingSelect";
import { SettingInput } from "@/components/ui/SettingInput";
import type {
  ResourceSelectorConfig,
  ResourceSelectorProps
} from "@/types/resource-selector";

export function ResourceSelector({
  nodeData,
  onNodeUpdate,
  nodeId,
  config
}: ResourceSelectorProps) {
  const searchParams = useSearchParams();
  const workflowId = searchParams.get("id");
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newResourceName, setNewResourceName] = useState("");
  const [creating, setCreating] = useState(false);

  const selectedId = (nodeData?.config?.[config.configFields.idField] ||
    "") as string;
  const selectedName = (nodeData?.config?.[config.configFields.nameField] ||
    "") as string;
  const [selectedResourceId, setSelectedResourceId] =
    useState<string>(selectedId);
  const [selectedResourceName, setSelectedResourceName] =
    useState<string>(selectedName);

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    if (selectedResourceId && selectedResourceName) {
      const resource = resources.find(
        (r) => config.getId(r) === selectedResourceId
      );
      if (resource) {
        const resourceId = config.getId(resource);
        const resourceName = config.getName(resource);
        if (
          nodeData?.config?.[config.configFields.idField] !== resourceId ||
          nodeData?.config?.[config.configFields.nameField] !== resourceName
        ) {
          onNodeUpdate(nodeId, {
            config: {
              ...nodeData?.config,
              [config.configFields.idField]: resourceId,
              [config.configFields.nameField]: resourceName
            }
          });
        }
      }
    }
  }, [
    selectedResourceId,
    selectedResourceName,
    resources,
    nodeId,
    onNodeUpdate,
    nodeData?.config
  ]);

  const loadResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await config.loadResources();
      setResources(result as any[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResource = async () => {
    const nameToCreate = config.transformCreateName
      ? config.transformCreateName(newResourceName.trim())
      : newResourceName.trim();

    if (!nameToCreate) {
      setError(`${config.label} name is required`);
      return;
    }

    if (config.validateCreateName) {
      const validationError = config.validateCreateName(nameToCreate);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setCreating(true);
    setError(null);
    try {
      if (!config.createResource) {
        setError("Create resource function not configured");
        return;
      }
      const newResource = await config.createResource(nameToCreate);
      setResources([...resources, newResource as any]);
      setSelectedResourceId(config.getId(newResource));
      setSelectedResourceName(config.getName(newResource));
      setNewResourceName("");
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  const handleSelectResource = (resourceId: string) => {
    const resource = resources.find((r) => config.getId(r) === resourceId);
    if (resource) {
      setSelectedResourceId(resourceId);
      setSelectedResourceName(config.getName(resource));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {config.label}
        </label>

        {loading ? (
          <div className="text-sm text-gray-500">{config.loadingText}</div>
        ) : (
          <>
            <SettingSelect
              value={selectedResourceId}
              onChange={(e) => handleSelectResource(e.target.value)}
              options={[
                { value: "", label: config.placeholder },
                ...resources.map((resource) => ({
                  value: config.getId(resource),
                  label: config.getDisplayLabel(resource)
                }))
              ]}
            />

            {selectedResourceId && (
              <div className="mt-2 text-xs text-gray-500">
                Selected: {selectedResourceName}
              </div>
            )}
          </>
        )}

        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>

      {config.customManagerLink && selectedResourceId && (
        <div className="mb-3">
          <a
            href={config.customManagerLink.href(
              selectedResourceId,
              nodeId,
              workflowId
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SettingButton className="bg-blue-600 hover:bg-blue-700 text-white">
              {config.customManagerLink.label}
            </SettingButton>
          </a>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <SettingButton onClick={loadResources} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </SettingButton>

        {config.createLabel && config.createResource && (
          <SettingButton onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? "Cancel" : config.createLabel}
          </SettingButton>
        )}

        {config.additionalActions?.map((action, idx) => (
          <SettingButton
            key={idx}
            onClick={() =>
              action.onClick(selectedResourceId, selectedResourceName)
            }
            disabled={
              action.disabled?.(selectedResourceId) || action.loading || loading
            }
          >
            {action.loading ? "Loading..." : action.label}
          </SettingButton>
        ))}
      </div>

      {showCreateForm && (
        <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {config.createLabel}
          </label>
          <div className="flex gap-2 items-start">
            <SettingInput
              value={newResourceName}
              onChange={(e) => setNewResourceName(e.target.value)}
              placeholder={config.createPlaceholder}
              className="flex-1 min-w-0"
            />
            <SettingButton
              onClick={handleCreateResource}
              disabled={creating || !newResourceName.trim()}
              className="flex-shrink-0"
            >
              {creating ? "Creating..." : "Create"}
            </SettingButton>
          </div>
        </div>
      )}

      {config.additionalContent && selectedResourceId && (
        <div>
          {config.additionalContent(selectedResourceId, selectedResourceName)}
        </div>
      )}
    </div>
  );
}
