"use client";

import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import { Spinner } from "@/components";
import {
  useWorkerQuery,
  useWorkerVersionQuery
} from "@/hooks/useWorkflowsQuery";
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  DetailsList,
  Alert,
  AlertTitle,
  CopyButton,
  Separator
} from "@/components";
import type { WorkerVersion } from "@/lib/api/types";
import { useVersionEdit } from "@/hooks/useVersionEdit";
import { buildFileTree } from "@/utils/file-tree";
import type { Module, FileTreeNode } from "@/types/worker";
import {
  FileTreeItem,
  CodeViewer,
  BindingsList,
  VersionHeader
} from "@/components/worker";
import { ROUTES } from "@/config/constants";

export default function VersionDetailPage() {
  const params = useParams();
  const workerId = typeof params.workerId === "string" ? params.workerId : "";
  const versionId =
    typeof params.versionId === "string" ? params.versionId : "";
  const [selectedModulePath, setSelectedModulePath] = useState<string | null>(
    null
  );

  const {
    data: worker,
    isLoading: workerLoading,
    error: workerError
  } = useWorkerQuery(workerId);
  const {
    data: version,
    isLoading: versionLoading,
    error: versionError
  } = useWorkerVersionQuery(workerId, versionId, "modules");

  const loading = workerLoading || versionLoading;
  const error =
    workerError instanceof Error
      ? workerError.message
      : versionError instanceof Error
        ? versionError.message
        : workerError || versionError
          ? String(workerError || versionError)
          : null;

  const isWorkerVersion = (data: unknown): data is WorkerVersion => {
    return (
      typeof data === "object" &&
      data !== null &&
      "id" in data &&
      "number" in data
    );
  };

  const typedVersion: WorkerVersion | null =
    version && isWorkerVersion(version) ? version : null;

  const modules: Module[] = useMemo(
    () => typedVersion?.modules || [],
    [typedVersion?.modules]
  );

  const fileTree = useMemo<FileTreeNode[]>(
    () => buildFileTree(modules),
    [modules]
  );

  const selectedModule: Module | null = useMemo(() => {
    if (!modules.length) return null;

    if (selectedModulePath) {
      const found = modules.find((m) => m.name === selectedModulePath);
      if (found) return found;
    }

    if (typedVersion?.main_module) {
      const main = modules.find((m) => m.name === typedVersion.main_module);
      if (main) return main;
    }

    const mainCodeModule =
      modules.find(
        (m) =>
          m.name.endsWith(".ts") ||
          m.name.endsWith(".js") ||
          m.name.endsWith(".mjs")
      ) || modules[0];

    return mainCodeModule || null;
  }, [modules, selectedModulePath, typedVersion?.main_module]);

  const { isEditing, handleEditVersion } = useVersionEdit();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Spinner size="lg" />
          <p className="text-base text-gray-600 font-medium">
            Loading version details...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </div>
    );
  }

  const versionDetails: Array<{
    label: string;
    value: string | React.ReactNode;
  }> = [
    { label: "Version ID", value: typedVersion?.id || "N/A" },
    { label: "Version Number", value: `v${typedVersion?.number || "N/A"}` },
    {
      label: "Created",
      value: typedVersion?.created_on
        ? new Date(typedVersion.created_on).toLocaleString()
        : "N/A"
    },
    {
      label: "Status",
      value: <Badge variant="success">Active</Badge>
    },
    {
      label: "Compatibility Date",
      value: typedVersion?.compatibility_date || "N/A"
    },
    { label: "Main Module", value: typedVersion?.main_module || "N/A" },
    {
      label: "Usage Model",
      value: typedVersion?.usage_model ? (
        <Badge
          variant={typedVersion.usage_model === "standard" ? "info" : "info"}
        >
          {typedVersion.usage_model}
        </Badge>
      ) : (
        "N/A"
      )
    },
    {
      label: "Source",
      value: typedVersion?.source ? (
        <Badge variant={typedVersion.source === "api" ? "success" : "info"}>
          {typedVersion.source}
        </Badge>
      ) : (
        "N/A"
      )
    }
  ];

  const annotationDetails: Array<{ label: string; value: string }> =
    typedVersion?.annotations
      ? Object.entries(typedVersion.annotations).map(([key, value]) => ({
          label: key.replace("workers/", "").replace(/_/g, " "),
          value: String(value)
        }))
      : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-6 py-8">
        <VersionHeader
          workerName={worker?.name || ""}
          version={typedVersion}
          isEditing={isEditing}
          onEditVersion={() => handleEditVersion(typedVersion)}
          canEdit={!!(typedVersion?.modules && typedVersion.modules.length > 0)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Version Information
                </h2>
              </CardHeader>
              <CardContent className="p-0">
                <DetailsList items={versionDetails} />
              </CardContent>
            </Card>

            {annotationDetails.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Annotations
                  </h2>
                </CardHeader>
                <CardContent className="p-0">
                  <DetailsList items={annotationDetails} />
                </CardContent>
              </Card>
            )}

            {typedVersion?.bindings && typedVersion.bindings.length > 0 && (
              <BindingsList bindings={typedVersion.bindings as any} />
            )}

            <Card className="overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Source Code
                </h2>
              </CardHeader>
              <CardContent className="p-0">
                <CodeViewer
                  selectedModule={selectedModule}
                  modules={modules}
                  fileTree={fileTree}
                  selectedModulePath={selectedModulePath}
                  onSelectModule={setSelectedModulePath}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Quick Actions
                </h2>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full justify-center"
                  >
                    Deploy to Production
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full justify-center"
                  >
                    Deploy to Staging
                  </Button>
                  <Separator />
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full justify-center"
                    onClick={() => handleEditVersion(typedVersion)}
                    disabled={
                      isEditing ||
                      !version?.modules ||
                      version.modules.length === 0
                    }
                  >
                    {isEditing ? "Parsing..." : "Edit Version"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Worker Details
                </h2>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">
                      Worker ID
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200 flex-1 truncate">
                        {worker?.id || "N/A"}
                      </code>
                      {worker?.id && <CopyButton text={worker.id} size="sm" />}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">
                      Worker Name
                    </label>
                    <p className="text-base text-gray-900 font-medium">
                      {worker?.name || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Version Metadata
                </h2>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">
                      Version ID
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200 flex-1 truncate">
                        {version?.id || "N/A"}
                      </code>
                      {version?.id && (
                        <CopyButton text={version.id} size="sm" />
                      )}
                    </div>
                  </div>
                  {version?.compatibility_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        Compatibility Date
                      </label>
                      <p className="text-base text-gray-900">
                        {version.compatibility_date}
                      </p>
                    </div>
                  )}
                  {version?.main_module && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        Main Module
                      </label>
                      <p className="text-base text-gray-900 font-mono">
                        {version.main_module}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="bg-red-50 border-b border-red-200">
                <h2 className="text-xl font-semibold text-red-900">
                  Danger Zone
                </h2>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    Irreversible actions. Please be certain before proceeding.
                  </p>
                  <Button
                    variant="danger"
                    size="lg"
                    className="w-full justify-center"
                  >
                    Delete Version
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
