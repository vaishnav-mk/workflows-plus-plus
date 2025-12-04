/**
 * Main Workflow Store
 * Combines all workflow-related stores into a single interface
 * NO hardcoded values - everything comes from backend
 */

import type { Node, Edge } from "reactflow";
import { useNodesStore } from "@/stores/workflow/nodesStore";
import { useSelectionStore } from "@/stores/workflow/selectionStore";
import { useUIStore } from "@/stores/workflow/uiStore";
import { useActionsStore } from "@/stores/workflow/actionsStore";
import { useInitializationStore } from "@/stores/workflow/initializationStore";
import { generateWorkflowId } from "@/utils/id-generator";

/**
 * Main workflow store hook
 * Combines all sub-stores for easy access
 */
export function useWorkflowStore() {
  const nodesStore = useNodesStore();
  const selectionStore = useSelectionStore();
  const uiStore = useUIStore();
  const actionsStore = useActionsStore();
  const initStore = useInitializationStore();
  
  return {
    // Nodes and edges
    nodes: nodesStore.nodes,
    edges: nodesStore.edges,
    setNodes: nodesStore.setNodes,
    setEdges: nodesStore.setEdges,
    
    // Selection
    selectedNode: selectionStore.selectedNode,
    selectedEdge: selectionStore.selectedEdge,
    setSelectedNode: selectionStore.setSelectedNode,
    setSelectedEdge: selectionStore.setSelectedEdge,
    
    // UI state
    showCodePreview: uiStore.showCodePreview,
    backendCode: uiStore.backendCode,
    backendBindings: uiStore.backendBindings,
    loading: uiStore.loading,
    mcpEnabled: uiStore.mcpEnabled,
    setShowCodePreview: uiStore.setShowCodePreview,
    setBackendCode: uiStore.setBackendCode,
    setBackendBindings: uiStore.setBackendBindings,
    setLoading: uiStore.setLoading,
    setMCPEnabled: uiStore.setMCPEnabled,
    
    // Actions
    addNode: actionsStore.addNode,
    removeNode: actionsStore.removeNode,
    updateNode: actionsStore.updateNode,
    insertNodeBetweenEdge: actionsStore.insertNodeBetweenEdge,
    handleNodesChange: actionsStore.handleNodesChange,
    handleEdgesChange: actionsStore.handleEdgesChange,
    handleConnect: actionsStore.handleConnect,
    
    // Initialization
    initializeWorkflow: initStore.initializeWorkflow,
    applyWorkflowToState: initStore.applyWorkflowToState,
    ensureEntryReturnNodes: initStore.ensureEntryReturnNodes,
    
    // Storage helpers
    saveWorkflowToStorage: (workflow: any) => {
      try {
        // Always generate a standardized workflow ID if not present
        const workflowId = workflow.id || generateWorkflowId();
        const workflowDef = {
          ...workflow,
          id: workflowId,
          metadata: {
            ...workflow.metadata,
            createdAt: workflow.metadata?.createdAt || Date.now(),
            updatedAt: Date.now(),
          }
        };
        const key = `workflow-${workflowId}`;
        localStorage.setItem(key, JSON.stringify(workflowDef));
      } catch (error) {
        console.error('[WorkflowStore] Failed to save workflow:', error);
      }
    },
    loadWorkflowFromStorage: (workflowId: string) => {
      try {
        const key = `workflow-${workflowId}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          return JSON.parse(stored);
        }
        return null;
      } catch (error) {
        console.error('[WorkflowStore] Failed to load workflow:', error);
        return null;
      }
    },
    // Auto-save current workflow state
    autoSaveWorkflow: () => {
      try {
        const { nodes, edges } = useNodesStore.getState();
        // Get workflow ID from URL or generate new one
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const workflowId = params.get('id') || generateWorkflowId();
          
          const workflow = {
            id: workflowId,
            nodes: nodes.map(n => ({
              id: n.id,
              type: n.data?.type || n.type,
              position: n.position,
              data: n.data,
            })),
            edges: edges.map(e => ({
              id: e.id,
              source: e.source,
              target: e.target,
              type: e.type,
              sourceHandle: (e as any).sourceHandle,
              targetHandle: (e as any).targetHandle,
            })),
            metadata: {
              updatedAt: Date.now(),
            }
          };
          
          const key = `workflow-${workflowId}`;
          localStorage.setItem(key, JSON.stringify(workflow));
        }
      } catch (error) {
        console.error('[WorkflowStore] Failed to auto-save workflow:', error);
      }
    },
  };
}
