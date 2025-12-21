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

let isInitializing = false;

export const useInitializationStore = create<InitializationState>(() => ({
  initializeWorkflow: async () => {
    if (isInitializing) {
      return;
    }
    
    const { nodes } = useNodesStore.getState();
    if (nodes.length > 0) {
      return;
    }
    
    isInitializing = true;
    useUIStore.getState().setLoading(true);
    
    try {
      const { nodes: newNodes, edges } = await createDefaultWorkflowNodes();
      
      useNodesStore.getState().setNodes(newNodes);
      useNodesStore.getState().setEdges(edges);
      
      useUIStore.getState().setLoading(false);
      
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

      const uniqueNodeTypes = new Set(
        (workflow.nodes || [])
          .map((n: any) => n.type || n.data?.type)
          .filter(Boolean)
      );
      
      const nodeDefinitions: Record<string, any> = {};

      await Promise.all(
        Array.from(uniqueNodeTypes).map(async (nodeType: string) => {
          try {
            const result = await apiClient.getNodeDefinition(nodeType);
            if (result.success && result.data) {
              nodeDefinitions[nodeType] = result.data;
            }
          } catch (error) {
            console.error(`${LOG_PREFIX} Failed to fetch node definition for ${nodeType}:`, error);
          }
        })
      );
      
      const mappedNodes: Node[] = (workflow.nodes || []).map((node: any, index: number) => {
        const nodeType = node.type || node.data?.type || "unknown";
        const registryInfo = nodeRegistry[nodeType] || { icon: "Code", name: nodeType };
        const nodeDef = nodeDefinitions[nodeType];
        
        let position = node.position || node.data?.position;
        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
          position = { x: 200 + (index * 50), y: 100 + (index * 100) };
        }
        
        return {
          id: node.id,
          type: "default",
          position,
          data: {
            label: node.label || node.data?.label || registryInfo.name,
            type: nodeType,
            icon: registryInfo.icon,
            status: "idle",
            config: node.config || node.data?.config || {},
            definition: nodeDef || undefined,
          },
        };
      });
      
      const mappedEdges: Edge[] = (workflow.edges || []).map((edge: any) => ({
        id: edge.id || `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: edge.type || "step",
        animated: true,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        data: edge.data || {},
      }));
      
      useNodesStore.getState().setNodes(mappedNodes);
      useNodesStore.getState().setEdges(mappedEdges);
      useUIStore.getState().setLoading(false);
      
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
