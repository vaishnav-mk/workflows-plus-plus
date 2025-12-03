/**
 * Workflow Initialization Store
 * Handles workflow initialization from backend
 */

import { create } from "zustand";
import type { Node, Edge } from "reactflow";
import { useNodesStore } from "@/stores/workflow/nodesStore";
import { useUIStore } from "@/stores/workflow/uiStore";
import { createDefaultWorkflowNodes } from "@/stores/workflow/nodeBuilder";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/stores/toastStore";

const LOG_PREFIX = '[InitializationStore]';

interface InitializationState {
  initializeWorkflow: () => Promise<void>;
  applyWorkflowToState: (workflow: {
    nodes?: any[];
    edges?: any[];
  }) => Promise<void>;
  ensureEntryReturnNodes: () => Promise<void>;
}

// Track initialization state to prevent re-initialization
let isInitializing = false;

export const useInitializationStore = create<InitializationState>(() => ({
  initializeWorkflow: async () => {
    // Prevent multiple simultaneous initializations
    if (isInitializing) {
      return;
    }
    
    // Check if workflow already has nodes - if so, don't re-initialize
    const { nodes } = useNodesStore.getState();
    if (nodes.length > 0) {
      return;
    }
    
    isInitializing = true;
    useUIStore.getState().setLoading(true);
    
    try {
      // Create default workflow nodes from backend
      const { nodes: newNodes, edges } = await createDefaultWorkflowNodes();
      
      // Set nodes and edges
      useNodesStore.getState().setNodes(newNodes);
      useNodesStore.getState().setEdges(edges);
      
      useUIStore.getState().setLoading(false);
      
      // Force a re-render by triggering a custom event
      setTimeout(() => {
        const canvas = document.querySelector('.workflow-canvas');
        if (canvas) {
          const event = new CustomEvent('workflow-nodes-loaded', { 
            detail: { nodeCount: newNodes.length } 
          });
          canvas.dispatchEvent(event);
        }
      }, 100);
      
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to initialize workflow:`, error);
      useUIStore.getState().setLoading(false);
      toast.error(
        "Failed to Initialize Workflow",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      isInitializing = false;
    }
  },
  
  applyWorkflowToState: async (workflow) => {
    useUIStore.getState().setLoading(true);
    
    try {
      // Fetch catalog to get node metadata
      const catalogResult = await apiClient.getCatalog();
      const nodeRegistry: Record<string, { icon: string; name: string }> = {};
      
      if (catalogResult.success && catalogResult.data) {
        catalogResult.data.forEach((nodeDef: any) => {
          nodeRegistry[nodeDef.type] = {
            icon: nodeDef.icon || "Code",
            name: nodeDef.name || nodeDef.type
          };
        });
      }
      
      // Map workflow nodes to ReactFlow nodes
      const mappedNodes: Node[] = (workflow.nodes || []).map((node: any) => {
        const registryInfo = nodeRegistry[node.type] || { icon: "Code", name: node.type };
        
        return {
          id: node.id,
          type: "default", // Use default ReactFlow node type
          position: node.position || { x: 200, y: 100 },
          data: {
            label: node.label || registryInfo.name,
            type: node.type,
            icon: registryInfo.icon,
            status: "idle",
            config: node.config || {},
          },
        };
      });
      
      // Map workflow edges to ReactFlow edges
      const mappedEdges: Edge[] = (workflow.edges || []).map((edge: any) => ({
        id: edge.id || `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: edge.type || "step", // Use step edges for straight horizontal/vertical lines
        animated: true,
      }));
      
      useNodesStore.getState().setNodes(mappedNodes);
      useNodesStore.getState().setEdges(mappedEdges);
      useUIStore.getState().setLoading(false);
      
      // Trigger auto-fit
      setTimeout(() => {
        const canvas = document.querySelector('.workflow-canvas');
        if (canvas) {
          const event = new CustomEvent('workflow-auto-fit');
          canvas.dispatchEvent(event);
        }
      }, 100);
      
      toast.success("Workflow Loaded", "Workflow has been applied to canvas");
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to apply workflow:`, error);
      useUIStore.getState().setLoading(false);
      toast.error(
        "Failed to Load Workflow",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  },
  
  ensureEntryReturnNodes: async () => {
    const { nodes } = useNodesStore.getState();
    
    const hasEntry = nodes.some(n => n.data?.type === 'entry');
    const hasReturn = nodes.some(n => n.data?.type === 'return');
    
    if (hasEntry && hasReturn) {
      return;
    }
    
    await useInitializationStore.getState().initializeWorkflow();
  },
}));

