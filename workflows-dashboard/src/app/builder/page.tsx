"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, CrossHatchBackground } from "@/components";
import { WorkflowToolbar } from "@/components/WorkflowToolbar";
import { CodePreview } from "@/components/CodePreview";
import type { Binding } from "@/types/components";
import { WorkflowSidebar } from "@/components/workflow/WorkflowSidebar";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { WorkflowSettingsPanel } from "@/components/workflow/WorkflowSettingsPanel";
import { useWorkflowStore } from "@/stores/workflowStore";
import { BaseNode } from "@/types/workflow";
import { useWorkflowInitialization } from "@/hooks/useWorkflowInitialization";
import { useDatabaseReturnHandler } from "@/hooks/useDatabaseReturnHandler";
import { useWorkflowId } from "@/hooks/useWorkflowId";
import { useMCPToggle } from "@/hooks/useMCPToggle";
import { useWorkflowActions } from "@/hooks/useWorkflowActions";
import { apiClient } from "@/lib/api-client";
import { isSuccessResponse } from "@/lib/api/utils";

function WorkflowBuilderContent() {
  const {
    nodes,
    edges,
    selectedNode,
    setSelectedNode,
    selectedEdge,
    setSelectedEdge,
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
    setNodes,
    updateNode,
    applyWorkflowToState
  } = useWorkflowStore();

  const { workflowId, setWorkflowId } = useWorkflowId(mcpEnabled);

  useEffect(() => {
    const fetchWorkflowFromBackend = async () => {
      if (nodes.length === 0 && workflowId) {
        try {
          const result = await apiClient.getWorkflow(workflowId);
          if (isSuccessResponse(result) && result.data) {
            const workflow = result.data;
            if (workflow.nodes && workflow.nodes.length > 0) {
              await applyWorkflowToState({
                nodes: workflow.nodes || [],
                edges: workflow.edges || []
              });
              saveWorkflowToStorage({
                id: workflow.id || workflowId,
                nodes: workflow.nodes || [],
                edges: workflow.edges || []
              });
            }
          }
        } catch (error) {
          console.error("Failed to fetch workflow from backend:", error);
        }
      }
    };

    fetchWorkflowFromBackend();
  }, [nodes.length, workflowId, applyWorkflowToState, saveWorkflowToStorage]);

  useDatabaseReturnHandler({
    nodes,
    updateNode,
    setSelectedNode,
    workflowId,
    mcpEnabled
  });

  const { handleMCPToggle } = useMCPToggle({
    nodes,
    setMCPEnabled,
    setNodes
  });

  const {
    handleCodePreviewClick,
    handleDeployClick,
    isCompiling,
    isDeploying
  } = useWorkflowActions({
    nodes,
    edges,
    workflowId,
    setBackendCode,
    setBackendBindings,
    setShowCodePreview,
    saveWorkflowToStorage
  });

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      <CrossHatchBackground pattern="large" />
      <div className="relative z-10 flex flex-col h-screen">
        <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6 py-4 shadow-sm">
          <div className="w-full flex items-center justify-between">
            <PageHeader
              title="Workflow Builder"
              description="Build and deploy workflows with drag and drop"
            />
            <WorkflowToolbar
              onCodePreview={handleCodePreviewClick}
              onDeploy={handleDeployClick}
              isDeploying={isDeploying || isCompiling}
              mcpEnabled={mcpEnabled}
              onMCPToggle={handleMCPToggle}
            />
          </div>
        </div>

        <div
          className="flex flex-1 overflow-hidden relative z-10"
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
          className="flex-1 flex flex-col overflow-hidden bg-white/40 backdrop-blur-sm"
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
    </div>
  );
}

export default function WorkflowBuilder() {
  const { mounted } = useWorkflowInitialization();

  if (!mounted) {
    return null;
  }

  return <WorkflowBuilderContent />;
}
