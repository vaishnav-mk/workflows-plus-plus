"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { WorkflowLoader } from "@/components/ui/Loader";
import { Spinner } from "@/components";
import {
  useWorkerQuery,
  useWorkerVersionQuery
} from "@/hooks/useWorkflowsQuery";
import {
  PageHeader,
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
import { apiClient } from "@/lib/api-client";
import { toast } from "@/stores/toastStore";

interface Version {
  id: string;
  created_on: string;
  number: number;
  compatibility_date?: string;
  main_module?: string;
  annotations?: {
    "workers/triggered_by"?: string;
    "workers/message"?: string;
    "workers/tag"?: string;
  };
  usage_model?: string;
  source?: string;
  modules?: Array<{
    name: string;
    content_type: string;
    content_base64: string;
  }>;
  bindings?: Array<{
    name: string;
    type: string;
    text?: string;
    json?: boolean;
  }>;
}

type Module = NonNullable<Version["modules"]>[number];

type FileTreeNode =
  | {
      type: "folder";
      name: string;
      path: string;
      children: FileTreeNode[];
      isOpen?: boolean;
    }
  | {
      type: "file";
      name: string;
      path: string;
      module: Module;
    };

interface FileTreeItemProps {
  node: FileTreeNode;
  level: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function FileTreeItem({
  node,
  level,
  selectedPath,
  onSelect
}: FileTreeItemProps) {
  const paddingLeft = 10 + level * 12;
  const [open, setOpen] = useState(false);

  if (node.type === "folder") {
    return (
      <div className="mb-0.5">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-gray-800 hover:bg-gray-100"
          style={{ paddingLeft }}
        >
          <span className="text-gray-500 select-none w-3 text-center text-[10px]">
            {open ? "▾" : "▸"}
          </span>
          <span className="font-medium text-gray-900 truncate">
            {node.name}
          </span>
        </button>
        {open && node.children.length > 0 && (
          <div>
            {node.children.map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected =
    selectedPath === node.path || selectedPath === node.module.name;

  return (
    <button
      type="button"
      onClick={() => onSelect(node.module.name)}
      className={`flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-left border border-transparent ${
        isSelected
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "text-gray-800 hover:bg-gray-100"
      }`}
      style={{ paddingLeft }}
    >
      <span className="text-gray-400 text-[9px]">●</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export default function VersionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workerId = params.workerId as string;
  const versionId = params.versionId as string;
  const [isEditing, setIsEditing] = useState(false);
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

  const modules: Module[] = version?.modules || [];

  const fileTree = useMemo<FileTreeNode[]>(() => {
    if (!modules.length) return [];

    const roots: FileTreeNode[] = [];

    const getOrCreateFolder = (
      nodes: FileTreeNode[],
      name: string,
      parentPath: string
    ): FileTreeNode => {
      const path = parentPath ? `${parentPath}/${name}` : name;
      const existing = nodes.find(
        (n) => n.type === "folder" && n.name === name
      );
      if (existing) {
        return existing;
      }

      const folder: FileTreeNode = {
        type: "folder",
        name,
        path,
        children: []
      };
      nodes.push(folder);
      return folder;
    };

    modules.forEach((module) => {
      const segments = module.name.split("/");

      // No folder path, just a file at the root
      if (segments.length === 1) {
        roots.push({
          type: "file",
          name: module.name,
          path: module.name,
          module
        });
        return;
      }

      let currentNodes = roots;
      let parentPath = "";

      // Create / find folders for all but the last segment
      for (let i = 0; i < segments.length - 1; i++) {
        const folderName = segments[i];
        const folderNode = getOrCreateFolder(
          currentNodes,
          folderName,
          parentPath
        );
        parentPath = folderNode.path;
        if (folderNode.type === "folder") {
          currentNodes = folderNode.children;
        } else {
          // This shouldn't happen, but handle it gracefully
          break;
        }
      }

      const fileName = segments[segments.length - 1];
      const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;

      // Avoid duplicates
      const exists = currentNodes.some(
        (n) => n.type === "file" && n.name === fileName && n.path === filePath
      );
      if (!exists) {
        currentNodes.push({
          type: "file",
          name: fileName,
          path: filePath,
          module
        });
      }
    });

    // Sort folders first, then files, alphabetically
    const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
      const folders: FileTreeNode[] = [];
      const files: FileTreeNode[] = [];

      nodes.forEach((node) => {
        if (node.type === "folder") {
          folders.push({
            ...node,
            children: sortNodes(node.children)
          });
        } else {
          files.push(node);
        }
      });

      folders.sort((a, b) => a.name.localeCompare(b.name));
      files.sort((a, b) => a.name.localeCompare(b.name));

      return [...folders, ...files];
    };

    return sortNodes(roots);
  }, [modules]);

  const selectedModule: Module | null = useMemo(() => {
    if (!modules.length) return null;

    if (selectedModulePath) {
      const found = modules.find((m) => m.name === selectedModulePath);
      if (found) return found;
    }

    // Prefer the main module if it exists
    if (version?.main_module) {
      const main = modules.find((m) => m.name === version.main_module);
      if (main) return main;
    }

    // Fallback: first JS/TS file, otherwise first module
    const mainCodeModule =
      modules.find(
        (m) =>
          m.name.endsWith(".ts") ||
          m.name.endsWith(".js") ||
          m.name.endsWith(".mjs")
      ) || modules[0];

    return mainCodeModule || null;
  }, [modules, selectedModulePath, version?.main_module]);

  const decodeModuleContent = (module?: Module | null) => {
    if (!module) return "";
    try {
      return atob(module.content_base64 || "");
    } catch {
      return "";
    }
  };

  const handleEditVersion = async () => {
    if (!version?.modules || version.modules.length === 0) {
      toast.error(
        "No source code available",
        "This version does not have any modules to edit."
      );
      return;
    }

    setIsEditing(true);
    try {
      // Find the main TypeScript/JavaScript module
      const mainModule =
        version.modules.find(
          (m: any) =>
            m.name.endsWith(".ts") ||
            m.name.endsWith(".js") ||
            m.name.endsWith(".mjs")
        ) || version.modules[0];

      if (!mainModule) {
        toast.error(
          "No code module found",
          "Could not find a code module in this version."
        );
        setIsEditing(false);
        return;
      }

      // Decode the base64 content
      const workflowCode = atob(mainModule.content_base64);

      // Call reverse codegen to parse the code
      const result = await apiClient.reverseCodegen(workflowCode);

      if (!result.success || !result.data) {
        throw new Error(
          result.error || result.message || "Failed to parse workflow code"
        );
      }

      // Store the parsed workflow in sessionStorage for the builder to load
      const workflowData = {
        nodes: result.data.nodes,
        edges: result.data.edges
      };

      sessionStorage.setItem(
        "workflow-from-version",
        JSON.stringify(workflowData)
      );

      // Navigate to builder
      router.push("/builder?type=version");

      toast.success(
        "Loading workflow",
        "Parsed workflow code and loading in builder..."
      );
    } catch (error) {
      console.error("Failed to edit version:", error);
      toast.error(
        "Failed to Edit Version",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      setIsEditing(false);
    }
  };

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
    { label: "Version ID", value: version?.id || "N/A" },
    { label: "Version Number", value: `v${version?.number || "N/A"}` },
    {
      label: "Created",
      value: version?.created_on
        ? new Date(version.created_on).toLocaleString()
        : "N/A"
    },
    {
      label: "Status",
      value: <Badge variant="success">Active</Badge>
    },
    {
      label: "Compatibility Date",
      value: version?.compatibility_date || "N/A"
    },
    { label: "Main Module", value: version?.main_module || "N/A" },
    {
      label: "Usage Model",
      value: version?.usage_model ? (
        <Badge variant={version.usage_model === "standard" ? "info" : "info"}>
          {version.usage_model}
        </Badge>
      ) : (
        "N/A"
      )
    },
    {
      label: "Source",
      value: version?.source ? (
        <Badge variant={version.source === "api" ? "success" : "info"}>
          {version.source}
        </Badge>
      ) : (
        "N/A"
      )
    }
  ];

  const annotationDetails: Array<{ label: string; value: string }> =
    version?.annotations
      ? Object.entries(version.annotations).map(([key, value]) => ({
          label: key.replace("workers/", "").replace(/_/g, " "),
          value: String(value)
        }))
      : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {worker?.name || "Worker"}
              </h1>
              <div className="flex items-center gap-3">
                <Badge variant="info" className="text-sm px-3 py-1">
                  Version {version?.number || "N/A"}
                </Badge>
                {version?.created_on && (
                  <span className="text-base text-gray-600">
                    Created{" "}
                    {new Date(version.created_on).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="lg">
                View All Versions
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleEditVersion}
                disabled={
                  isEditing || !version?.modules || version.modules.length === 0
                }
              >
                {isEditing ? "Parsing..." : "Edit Version"}
              </Button>
              <Button variant="primary" size="lg">
                Deploy to Production
              </Button>
            </div>
          </div>
        </div>

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

            {version?.bindings && version.bindings.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Environment Variables & Bindings
                  </h2>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {version.bindings.map(
                      (
                        binding: {
                          name: string;
                          type: string;
                          text?: string;
                          json?: boolean;
                        },
                        index: number
                      ) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-5 bg-white hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {binding.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="info" className="text-sm">
                                {binding.type}
                              </Badge>
                              {binding.json && (
                                <Badge variant="info" className="text-sm">
                                  JSON
                                </Badge>
                              )}
                            </div>
                          </div>
                          {binding.text && (
                            <div className="relative">
                              <div className="absolute top-3 right-3 z-10">
                                <CopyButton
                                  text={
                                    binding.json
                                      ? JSON.stringify(
                                          JSON.parse(binding.text),
                                          null,
                                          2
                                        )
                                      : binding.text
                                  }
                                  size="md"
                                />
                              </div>
                              <pre className="text-sm text-gray-800 bg-gray-50 rounded-lg p-4 overflow-x-auto border border-gray-200 font-mono leading-relaxed">
                                {binding.json
                                  ? JSON.stringify(
                                      JSON.parse(binding.text),
                                      null,
                                      2
                                    )
                                  : binding.text}
                              </pre>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Source Code
                </h2>
              </CardHeader>
              <CardContent className="p-0">
                {modules.length > 0 ? (
                  <div className="flex flex-col lg:flex-row max-h-[70vh] min-h-[420px] border-t border-gray-200">
                    {/* File tree */}
                    <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 overflow-y-auto">
                      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">
                          Files
                        </span>
                        <span className="text-xs text-gray-500">
                          {modules.length} modules
                        </span>
                      </div>
                      <div className="p-2">
                        {fileTree.map((node) => (
                          <FileTreeItem
                            key={node.path}
                            node={node}
                            level={0}
                            selectedPath={selectedModule?.name || null}
                            onSelect={(path) => setSelectedModulePath(path)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Code viewer */}
                    <div className="flex-1 min-w-0 bg-white text-gray-900 flex flex-col">
                      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs uppercase tracking-wide text-gray-400">
                            {selectedModule
                              ? selectedModule.content_type
                              : "text/plain"}
                          </span>
                          {selectedModule && (
                            <span className="text-sm font-mono text-gray-800 truncate max-w-[280px]">
                              {selectedModule.name}
                            </span>
                          )}
                        </div>
                        {selectedModule && (
                          <CopyButton
                            text={decodeModuleContent(selectedModule)}
                            size="sm"
                          />
                        )}
                      </div>
                      <div className="flex-1 overflow-auto">
                        <div className="h-full bg-gray-50">
                          {selectedModule ? (
                            <pre className="text-xs sm:text-sm leading-relaxed font-mono px-4 py-4 whitespace-pre text-gray-900">
                              {decodeModuleContent(selectedModule)}
                            </pre>
                          ) : (
                            <div className="h-full flex items-center justify-center text-sm text-gray-400">
                              No file selected
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-900">
                          Default Worker Code
                        </h3>
                      </div>
                      <div className="relative">
                        <div className="absolute top-3 right-3 z-10">
                          <CopyButton
                            text={`export default {\n  async fetch(request) {\n    return new Response('Hello World!');\n  }\n};`}
                            size="md"
                          />
                        </div>
                        <pre className="text-sm text-gray-800 p-5 overflow-x-auto font-mono leading-relaxed bg-gray-50">
                          {`export default {\n  async fetch(request) {\n    return new Response('Hello World!');\n  }\n};`}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
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
                    onClick={handleEditVersion}
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
