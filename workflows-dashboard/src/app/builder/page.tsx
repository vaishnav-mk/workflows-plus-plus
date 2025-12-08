"use client";

import React, { useState, useCallback } from "react";
import { PageHeader } from "@/components";
import { WorkflowToolbar } from "@/components/WorkflowToolbar";
import { CodePreview } from "@/components/CodePreview";
import type { Binding } from "@/types/components";
import { WorkflowSidebar } from "@/components/workflow/WorkflowSidebar";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { WorkflowSettingsPanel } from "@/components/workflow/WorkflowSettingsPanel";
import { useWorkflowStore } from "@/stores/workflowStore";
import { toast } from "@/stores/toastStore";
import { BaseNode } from "@/types/workflow";
import {
  useCompileWorkflowMutation,
  useDeployWorkflowMutation
} from "@/hooks/useWorkflowsQuery";
import { generateWorkflowId } from "@/utils/id-generator";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

function WorkflowBuilderContent() {
  const {
    nodes,
    edges,
    selectedNode,
    setSelectedNode,
    selectedEdge,
    setSelectedEdge,
    updateNode,
    insertNodeBetweenEdge,
    showCodePreview,
    setShowCodePreview,
    backendCode,
    setBackendCode,
    backendBindings,
    setBackendBindings,
    mcpEnabled,
    setMCPEnabled,
    handleNodesChange,
    handleEdgesChange,
    handleConnect,
    saveWorkflowToStorage,
    setNodes
  } = useWorkflowStore();

  const [isDeploying, setIsDeploying] = useState(false);
  const compileWorkflowMutation = useCompileWorkflowMutation();
  const deployWorkflowMutation = useDeployWorkflowMutation();
  const router = useRouter();

  // Get workflow ID from URL or generate one
  const [workflowId, setWorkflowId] = React.useState<string | null>(null);

  // Handle return from database manager - separate effect that runs when nodes or URL params change
  const processedReturnRef = React.useRef<string | null>(null);

  // Also listen to URL changes via popstate
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      console.log("[WorkflowBuilder] PopState event, URL changed", {
        url: window.location.href,
        search: window.location.search
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      console.log("[WorkflowBuilder] Window not available, skipping");
      return;
    }

    const fullUrl = window.location.href;
    const searchString = window.location.search;
    const hash = window.location.hash;

    console.log("[WorkflowBuilder] Database return effect triggered", {
      hasWindow: true,
      nodesCount: nodes.length,
      fullUrl,
      searchString,
      searchStringLength: searchString.length,
      hash,
      pathname: window.location.pathname
    });

    if (nodes.length === 0) {
      console.log("[WorkflowBuilder] No nodes loaded yet, waiting...", {
        nodesCount: 0
      });
      return;
    }

    // Parse search string directly - try multiple methods
    console.log("[WorkflowBuilder] Attempting to parse URL", {
      searchString,
      searchStringType: typeof searchString,
      searchStringLength: searchString?.length,
      firstChar: searchString?.[0],
      lastChar: searchString?.[searchString?.length - 1]
    });

    // Try parsing with and without the leading ?
    const searchToParse = searchString.startsWith("?")
      ? searchString.substring(1)
      : searchString;
    const params = new URLSearchParams(searchToParse);
    const allParamsArray = Array.from(params.entries());

    console.log("[WorkflowBuilder] Raw URL parsing", {
      originalSearchString: searchString,
      parsedSearchString: searchToParse,
      paramsObject: Object.fromEntries(params.entries()),
      allParamsArray,
      paramCount: allParamsArray.length,
      keys: Array.from(params.keys())
    });

    // Try getting params multiple ways
    const databaseId = params.get("database_id") || params.get("database_id");
    const databaseName = params.get("database") || params.get("database");
    const query = params.get("query") || params.get("query");
    const returnNodeId =
      params.get("returnNodeId") || params.get("returnNodeId");
    const returnToBuilder =
      params.get("returnToBuilder") || params.get("returnToBuilder");

    // Also try manual parsing as fallback
    let manualDatabaseId: string | null = null;
    let manualQuery: string | null = null;
    let manualReturnNodeId: string | null = null;

    if (searchString) {
      const matchDatabaseId = searchString.match(/[?&]database_id=([^&]+)/);
      const matchQuery = searchString.match(/[?&]query=([^&]+)/);
      const matchReturnNodeId = searchString.match(/[?&]returnNodeId=([^&]+)/);

      manualDatabaseId = matchDatabaseId
        ? decodeURIComponent(matchDatabaseId[1])
        : null;
      manualQuery = matchQuery ? decodeURIComponent(matchQuery[1]) : null;
      manualReturnNodeId = matchReturnNodeId
        ? decodeURIComponent(matchReturnNodeId[1])
        : null;

      console.log("[WorkflowBuilder] Manual regex parsing", {
        matchDatabaseId: matchDatabaseId?.[1],
        matchQuery: matchQuery?.[1]?.substring(0, 50),
        matchReturnNodeId: matchReturnNodeId?.[1],
        manualDatabaseId,
        manualQuery: manualQuery?.substring(0, 50),
        manualReturnNodeId
      });
    }

    // Use manual parsing if URLSearchParams failed
    const finalDatabaseId = databaseId || manualDatabaseId;
    const finalQuery = query || manualQuery;
    const finalReturnNodeId = returnNodeId || manualReturnNodeId;

    console.log("[WorkflowBuilder] Final parsed URL parameters", {
      rawSearchString: searchString,
      databaseId: finalDatabaseId,
      databaseName,
      query: finalQuery
        ? finalQuery.substring(0, 50) + (finalQuery.length > 50 ? "..." : "")
        : null,
      queryLength: finalQuery?.length,
      queryRaw: finalQuery,
      returnNodeId: finalReturnNodeId,
      returnToBuilder,
      allParams: allParamsArray,
      paramCount: allParamsArray.length,
      usingManualParsing: !databaseId && !!manualDatabaseId
    });

    // Create a unique key for this return operation using final parsed values
    const returnKey = `${finalReturnNodeId}-${finalDatabaseId}-${finalQuery}`;
    console.log("[WorkflowBuilder] Return key", {
      returnKey,
      alreadyProcessed: processedReturnRef.current,
      finalReturnNodeId,
      finalDatabaseId,
      finalQuery: finalQuery?.substring(0, 30)
    });

    // Skip if we've already processed this return
    if (!finalDatabaseId || !finalQuery || !finalReturnNodeId) {
      console.log("[WorkflowBuilder] Missing required params", {
        hasDatabaseId: !!finalDatabaseId,
        hasQuery: !!finalQuery,
        hasReturnNodeId: !!finalReturnNodeId,
        databaseIdValue: finalDatabaseId,
        queryValue: finalQuery?.substring(0, 50),
        returnNodeIdValue: finalReturnNodeId
      });
      return;
    }

    if (processedReturnRef.current === returnKey) {
      console.log("[WorkflowBuilder] Already processed this return, skipping");
      return;
    }

    console.log("[WorkflowBuilder] Searching for D1 node", {
      returnNodeId: finalReturnNodeId,
      nodesCount: nodes.length,
      allNodeIds: nodes.map((n) => n.id),
      allNodeTypes: nodes.map((n) => ({
        id: n.id,
        type: n.data?.type || n.type
      }))
    });

    // Find the D1 query node
    const d1Node = nodes.find((n) => {
      const nodeType = n.data?.type || n.type;
      const matches = n.id === finalReturnNodeId && nodeType === "d1-query";
      console.log("[WorkflowBuilder] Checking node", {
        nodeId: n.id,
        nodeType,
        matchesId: n.id === finalReturnNodeId,
        matchesType: nodeType === "d1-query",
        matches
      });
      return matches;
    });

    if (d1Node) {
      const currentConfig = (d1Node.data?.config || {}) as Record<string, any>;

      console.log("[WorkflowBuilder] Found D1 node, updating", {
        nodeId: finalReturnNodeId,
        nodeData: d1Node.data,
        currentConfig,
        databaseId: finalDatabaseId,
        databaseName,
        queryRaw: finalQuery,
        queryLength: finalQuery?.length
      });

      // Decode the query (it's URL encoded)
      let decodedQuery: string;
      try {
        decodedQuery = decodeURIComponent(finalQuery);
        console.log("[WorkflowBuilder] Decoded query", {
          original: finalQuery.substring(0, 100),
          decoded: decodedQuery.substring(0, 100),
          decodedLength: decodedQuery.length
        });
      } catch (error) {
        console.error("[WorkflowBuilder] Failed to decode query", error);
        decodedQuery = finalQuery; // Fallback to original
      }

      const newConfig = {
        ...currentConfig,
        database_id: finalDatabaseId,
        database: databaseName || currentConfig.database || "DB",
        query: decodedQuery
      };

      console.log("[WorkflowBuilder] New config to apply", {
        oldConfig: currentConfig,
        newConfig,
        nodeId: finalReturnNodeId
      });

      // Update the node with new config
      updateNode(finalReturnNodeId, {
        config: newConfig
      });

      console.log("[WorkflowBuilder] Node update called, verifying...");

      // Verify the update by checking the node again after a brief delay
      setTimeout(() => {
        const updatedNode = nodes.find((n) => n.id === finalReturnNodeId);
        const config = updatedNode?.data?.config as
          | Record<string, any>
          | undefined;
        console.log("[WorkflowBuilder] Node after update", {
          nodeId: finalReturnNodeId,
          config: config,
          queryInConfig: config?.query,
          databaseInConfig: config?.database,
          databaseIdInConfig: config?.database_id
        });
      }, 100);

      // Mark as processed
      processedReturnRef.current = returnKey;
      console.log("[WorkflowBuilder] Marked return as processed", {
        returnKey
      });

      // Select the node to show the update
      setSelectedNode(d1Node);
      console.log("[WorkflowBuilder] Selected node");

      // Clean up URL params but preserve ALL existing parameters
      const newParams = new URLSearchParams(window.location.search);
      const id = newParams.get("id");

      console.log("[WorkflowBuilder] Cleaning up URL params", {
        before: Array.from(newParams.entries())
      });

      // Only remove the temporary return parameters
      newParams.delete("database_id");
      newParams.delete("database");
      newParams.delete("query");
      newParams.delete("returnNodeId");
      newParams.delete("returnToBuilder");
      newParams.delete("workflowId");

      // Preserve existing workflow ID
      const preservedId = id || workflowId;
      if (preservedId) {
        newParams.set("id", preservedId);
        if (!id && workflowId) {
          setWorkflowId(preservedId);
        }
      }

      // Preserve MCP parameter if enabled
      if (mcpEnabled) {
        newParams.set("mcp", "1");
      }

      const finalUrl = `${window.location.pathname}?${newParams.toString()}`;
      console.log("[WorkflowBuilder] Final URL after cleanup", {
        url: finalUrl,
        params: Array.from(newParams.entries())
      });

      // All other parameters (type, template_type, etc.) are already preserved
      window.history.replaceState({}, "", finalUrl);

      console.log("[WorkflowBuilder] URL updated, process complete");
    } else {
      console.warn("[WorkflowBuilder] D1 node not found", {
        returnNodeId,
        nodesCount: nodes.length,
        nodeIds: nodes.map((n) => n.id),
        nodeTypes: nodes.map((n) => ({
          id: n.id,
          type: n.data?.type || n.type,
          data: n.data
        }))
      });
    }
  }, [nodes, updateNode, setSelectedNode, workflowId, mcpEnabled]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      const regen = params.get("regen");
      const mcpParam = params.get("mcp");

      // Handle MCP parameter
      if (mcpParam === "1") {
        setMCPEnabled(true);
      } else if (mcpParam === "0" || (mcpParam === null && mcpEnabled)) {
        // Only update URL if MCP is enabled but param is missing
        if (mcpEnabled && mcpParam === null) {
          const newParams = new URLSearchParams(window.location.search);
          newParams.set("mcp", "1");
          window.history.replaceState(
            {},
            "",
            `${window.location.pathname}?${newParams.toString()}`
          );
        }
      }

      if (id && regen === "1") {
        // We loaded the existing workflow by this id already; now generate a fresh ID
        const newId = generateWorkflowId();
        setWorkflowId(newId);
        const newParams = new URLSearchParams(window.location.search);
        newParams.set("id", newId);
        newParams.delete("regen");
        if (mcpEnabled) {
          newParams.set("mcp", "1");
        }
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?${newParams.toString()}`
        );
      } else if (id) {
        setWorkflowId(id);
      } else if (!workflowId) {
        // Only generate new workflow ID if we don't already have one
        // Generate new workflow ID and update URL
        const newId = generateWorkflowId();
        setWorkflowId(newId);
        const newParams = new URLSearchParams(window.location.search);
        newParams.set("id", newId);
        if (mcpEnabled) {
          newParams.set("mcp", "1");
        }
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?${newParams.toString()}`
        );
      }
    }
  }, [nodes, updateNode, setSelectedNode, mcpEnabled, setMCPEnabled, workflowId]);

  const handleCodePreviewClick = useCallback(async () => {
    try {
      // Use workflow ID from state or generate new one
      const currentWorkflowId = workflowId || generateWorkflowId();
      const workflow = {
        name: "Workflow",
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data?.type || n.type,
          data: n.data,
          config: n.data?.config
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          // Preserve branch information for conditional routing
          sourceHandle: (e as any).sourceHandle,
          targetHandle: (e as any).targetHandle
        })),
        options: {
          workflowId: currentWorkflowId
        }
      };

      const result = await compileWorkflowMutation.mutateAsync(workflow);
      if (result) {
        setBackendCode(result.tsCode);
        setBackendBindings(result.bindings || []);
        toast.success("Code Generated", "Worker code generated successfully");
      } else {
        setBackendCode(undefined);
        setBackendBindings(undefined);
        toast.warning(
          "Code Generation Issue",
          "No worker code found in response"
        );
      }
    } catch (e) {
      setBackendCode(undefined);
      setBackendBindings(undefined);
      toast.error(
        "Code Generation Failed",
        e instanceof Error ? e.message : "Unknown error"
      );
    }
    setShowCodePreview(true);
  }, [
    nodes,
    edges,
    workflowId,
    setBackendCode,
    setBackendBindings,
    setShowCodePreview,
    compileWorkflowMutation
  ]);

  const handleDeployClick = useCallback(async () => {
    setIsDeploying(true);

    try {
      // Use workflow ID from state or generate new one
      const currentWorkflowId = workflowId || generateWorkflowId();

      // Compile workflow first to get code and bindings
      const workflow = {
        name: "Workflow",
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data?.type || n.type,
          data: n.data,
          config: n.data?.config
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          // Preserve branch information for conditional routing
          sourceHandle: (e as any).sourceHandle,
          targetHandle: (e as any).targetHandle
        })),
        options: {
          workflowId: currentWorkflowId
        }
      };

      const compileResult = await compileWorkflowMutation.mutateAsync(workflow);

      if (!compileResult) {
        toast.error("Deployment Failed", "Failed to compile workflow");
        return;
      }

      // Save workflow to storage
      saveWorkflowToStorage({
        id: currentWorkflowId,
        nodes,
        edges,
        backendCode: compileResult.tsCode,
        backendBindings: compileResult.bindings
      });

      // Deploy workflow
      const deployResult = await deployWorkflowMutation.mutateAsync({
        workflowId: currentWorkflowId,
        options: {
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.data?.type || n.type,
            data: n.data,
            config: n.data?.config
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target
          })),
          bindings: compileResult.bindings
        }
      });

      // Get deployment ID from result
      const deploymentId =
        deployResult?.deploymentId ||
        (currentWorkflowId.startsWith("workflow-")
          ? currentWorkflowId.replace("workflow-", "deployment-")
          : `deployment-${currentWorkflowId}`);

      // Redirect to deployment page
      router.push(`/deployment?id=${deploymentId}`);
    } catch (e) {
      toast.error(
        "Deployment Failed",
        e instanceof Error ? e.message : "Unknown error"
      );
      setIsDeploying(false);
    }
  }, [
    nodes,
    edges,
    workflowId,
    compileWorkflowMutation,
    deployWorkflowMutation,
    router,
    saveWorkflowToStorage
  ]);

  const handleMCPToggle = useCallback(
    async (enabled: boolean) => {
      setMCPEnabled(enabled);

      // Update URL parameter
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (enabled) {
          params.set("mcp", "1");
        } else {
          params.delete("mcp");
        }
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?${params.toString()}`
        );
      }

      const updatedNodes = await Promise.all(
        nodes.map(async (node) => {
          const nodeType = node.data?.type;

          if (enabled) {
            if (nodeType === "entry") {
              const def = await apiClient.getNodeDefinition("mcp-tool-input");
              if (def.success && def.data) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    type: "mcp-tool-input",
                    label: def.data.metadata.name,
                    icon: def.data.metadata.icon
                  }
                };
              }
            } else if (nodeType === "return") {
              const def = await apiClient.getNodeDefinition("mcp-tool-output");
              if (def.success && def.data) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    type: "mcp-tool-output",
                    label: def.data.metadata.name,
                    icon: def.data.metadata.icon
                  }
                };
              }
            }
          } else {
            if (nodeType === "mcp-tool-input") {
              const def = await apiClient.getNodeDefinition("entry");
              if (def.success && def.data) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    type: "entry",
                    label: def.data.metadata.name,
                    icon: def.data.metadata.icon
                  }
                };
              }
            } else if (nodeType === "mcp-tool-output") {
              const def = await apiClient.getNodeDefinition("return");
              if (def.success && def.data) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    type: "return",
                    label: def.data.metadata.name,
                    icon: def.data.metadata.icon
                  }
                };
              }
            }
          }

          return node;
        })
      );

      setNodes(updatedNodes);
    },
    [nodes, setMCPEnabled, setNodes]
  );

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="w-full flex items-center justify-between">
          <PageHeader
            title="Workflow Builder"
            description="Build and deploy workflows with drag and drop"
          />
          <WorkflowToolbar
            onCodePreview={handleCodePreviewClick}
            onDeploy={handleDeployClick}
            isDeploying={isDeploying || compileWorkflowMutation.isPending}
            mcpEnabled={mcpEnabled}
            onMCPToggle={handleMCPToggle}
          />
        </div>
      </div>

      {/* Main Content */}
      <div
        className="flex flex-1 overflow-hidden"
        style={{ height: "calc(100vh - 80px)" }}
      >
        <WorkflowSidebar
          onAddNode={(nodeType: string) => {
            if (selectedEdge) {
              insertNodeBetweenEdge(
                (selectedEdge as any).id as string,
                nodeType
              );
              setSelectedEdge(null);
            }
          }}
          nodes={nodes}
          edges={edges}
          edgeSelected={!!selectedEdge}
        />

        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ height: "100%", width: "100%" }}
        >
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onEdgeClick={(_, edge) => {
              setSelectedEdge(edge as any);
            }}
          />
        </div>

        <WorkflowSettingsPanel
          selectedNode={selectedNode}
          onNodeUpdate={updateNode}
          onClose={() => setSelectedNode(null)}
        />
      </div>

      <CodePreview
        workflow={{
          id: "workflow-1",
          name: "My Workflow",
          description: "Generated workflow",
          version: "1.0.0",
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            author: "User",
            tags: []
          },
          bindings: {
            kv: [],
            d1: [],
            r2: [],
            ai: { binding: "AI" },
            secrets: []
          },
          nodes: nodes.map((node) => ({
            id: node.id,
            type: node.type || "default",
            position: node.position,
            data: (node.data as any) || {
              config: {},
              inputs: [],
              outputs: [],
              validation: { isValid: true, errors: [], warnings: [] }
            },
            metadata: (node as any).metadata || {
              label: node.type || "Node",
              description: "",
              icon: "Circle",
              category: "control" as const,
              version: "1.0.0"
            }
          })) as BaseNode[],
          edges: edges,
          entryNodeId:
            nodes.find((n) => n.type === "entry")?.id || nodes[0]?.id || "",
          variables: {}
        }}
        isOpen={showCodePreview}
        onClose={() => setShowCodePreview(false)}
        code={backendCode || ""}
        bindings={
          Array.isArray(backendBindings)
            ? backendBindings.filter(
                (b): b is Binding =>
                  typeof b === "object" &&
                  b !== null &&
                  "type" in b &&
                  typeof (b as Binding).type === "string" &&
                  "name" in b &&
                  typeof (b as Binding).name === "string"
              )
            : []
        }
        nodes={nodes}
        onNodeSelect={(nodeId) => {
          const node = nodes.find((n) => n.id === nodeId);
          if (node) {
            setSelectedNode(node);
          }
        }}
      />
    </div>
  );
}

export default function WorkflowBuilder() {
  const [mounted, setMounted] = useState(false);
  const {
    initializeWorkflow,
    loadWorkflowFromStorage,
    applyWorkflowToState,
    saveWorkflowToStorage
  } = useWorkflowStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    if (!mounted || initializedRef.current) return;

    const init = async () => {
      initializedRef.current = true;

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const type = params.get("type");
        const id = params.get("id");
        const templateType = params.get("template_type");

        // Handle starter workflow
        // Format: ?type=starter&template_type=ai-processing&id=workflow-ghost-beneficiary-bed
        if (type === "starter") {
          try {
            const { apiClient } = await import("@/lib/api-client");

            // Use template_type to get the starter, or fallback to id if template_type not provided
            const starterId = templateType || id;
            if (!starterId) {
              console.error(
                "[WorkflowBuilder] Missing starter ID (template_type or id)"
              );
              await initializeWorkflow();
              return;
            }

            const result = await apiClient.getWorkflowStarter(starterId);

            if (result.success && result.data) {
              const starter = result.data;
              // Use provided workflow ID or generate new one
              const workflowId = id || generateWorkflowId();

              // Update URL with proper parameters, but PRESERVE all existing parameters
              const newParams = new URLSearchParams(window.location.search);
              newParams.set("type", "starter");
              if (templateType) {
                newParams.set("template_type", templateType);
              } else if (starterId) {
                newParams.set("template_type", starterId);
              }
              newParams.set("id", workflowId);

              console.log(
                "[WorkflowBuilder] Updating URL for starter workflow",
                {
                  before: window.location.search,
                  after: newParams.toString(),
                  preservedParams: Array.from(newParams.entries())
                }
              );

              window.history.replaceState(
                {},
                "",
                `${window.location.pathname}?${newParams.toString()}`
              );

              await applyWorkflowToState({
                nodes: starter.workflow.nodes,
                edges: starter.workflow.edges
              });

              // Save starter workflow to storage
              saveWorkflowToStorage({
                id: workflowId,
                nodes: starter.workflow.nodes,
                edges: starter.workflow.edges
              });
              return;
            }
          } catch (error) {
            console.error("[WorkflowBuilder] Failed to load starter:", error);
          }
        }

        // Handle AI-generated workflow
        if (type === "ai" && id) {
          const storedWorkflow = loadWorkflowFromStorage(id);
          if (storedWorkflow) {
            await applyWorkflowToState(storedWorkflow);
            return;
          }
        }

        // Handle workflow from storage (by ID)
        if (id && !type) {
          const storedWorkflow = loadWorkflowFromStorage(id);
          if (storedWorkflow) {
            await applyWorkflowToState(storedWorkflow);
            return;
          }
        }

        // Handle workflow from version (reverse codegen)
        if (type === "version") {
          try {
            const storedWorkflowStr = sessionStorage.getItem(
              "workflow-from-version"
            );
            if (storedWorkflowStr) {
              const storedWorkflow = JSON.parse(storedWorkflowStr);
              await applyWorkflowToState(storedWorkflow);
              // Clear the stored workflow after loading
              sessionStorage.removeItem("workflow-from-version");
              return;
            }
          } catch (error) {
            console.error(
              "[WorkflowBuilder] Failed to load workflow from version:",
              error
            );
            toast.error(
              "Failed to Load Workflow",
              "Could not parse workflow from version."
            );
          }
        }
      }

      // Default: Initialize empty workflow
      await initializeWorkflow();
    };

    init();
  }, [mounted, initializeWorkflow, applyWorkflowToState, loadWorkflowFromStorage, saveWorkflowToStorage]); // Only depend on mounted, not the functions

  if (!mounted) {
    return null;
  }

  return <WorkflowBuilderContent />;
}
