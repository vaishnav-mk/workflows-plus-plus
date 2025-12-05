import { create } from "zustand";
import type { Node, Edge } from "reactflow";
import { useNodesStore } from "@/stores/workflow/nodesStore";
import { useSelectionStore } from "@/stores/workflow/selectionStore";
import { createNodeFromBackend } from "@/stores/workflow/nodeBuilder";
import { applyNodeChanges, applyEdgeChanges, addEdge as addEdgeUtil } from "reactflow";
import type { ActionsState } from "@/types/stores";
import { enrichEdges, enrichEdge } from "./edgeEnrichment";

const LOG_PREFIX = '[ActionsStore]';

// Helper to trigger auto-save
function triggerAutoSave() {
  // Use setTimeout to debounce auto-save
  if (typeof window !== 'undefined') {
    const timeoutId = (window as any).__workflowAutoSaveTimeout;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    (window as any).__workflowAutoSaveTimeout = setTimeout(() => {
      try {
        const { useNodesStore } = require("@/stores/workflow/nodesStore");
        const { generateWorkflowId } = require("@/utils/id-generator");
        const { nodes, edges } = useNodesStore.getState();
        
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const workflowId = params.get('id') || generateWorkflowId();
          
          const workflow = {
            id: workflowId,
            nodes: nodes.map((n: any) => ({
              id: n.id,
              type: n.data?.type || n.type,
              position: n.position,
              data: n.data,
            })),
            edges: edges.map((e: any) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              type: e.type,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
            })),
            metadata: {
              updatedAt: Date.now(),
            }
          };
          
          const key = `workflow-${workflowId}`;
          localStorage.setItem(key, JSON.stringify(workflow));
        }
      } catch (error) {
        console.error('[ActionsStore] Failed to auto-save workflow:', error);
      }
    }, 1000); // Debounce by 1 second
  }
}

export const useActionsStore = create<ActionsState>(() => ({
  addNode: async (nodeType: string) => {
    try {
      const { nodes, edges } = useNodesStore.getState();

      const newNode = await createNodeFromBackend(nodeType, { x: 0, y: 0 });
      useNodesStore.getState().addNode(newNode);
      
      // If conditional router, automatically create branch edges
      if (nodeType === 'conditional-router') {
        // Wait a tick for layout to be applied
        await new Promise(resolve => setTimeout(resolve, 0));
        
        const config = (newNode.data as any)?.config || {};
        const cases = config.cases || [];
        
        if (cases.length > 0) {
          // Find the return node (main flow) or next node in flow
          const { nodes: currentNodes, edges: currentEdges } = useNodesStore.getState();
          const returnNode = currentNodes.find(n => n.data?.type === 'return');
          
          // Find what node comes after the router in the flow (if any)
          // Look for edges that would connect from router to next node
          let targetNode = returnNode;
          
          // If no return node, try to find the next node in the flow
          if (!targetNode && currentEdges.length > 0) {
            // Find nodes that don't have incoming edges (potential next nodes)
            const nodesWithIncoming = new Set(currentEdges.map(e => e.target));
            const nextNodes = currentNodes.filter(n => 
              n.id !== newNode.id && 
              !nodesWithIncoming.has(n.id) &&
              n.data?.type !== 'entry'
            );
            targetNode = nextNodes[0] || null;
          }
          
          // Create edges for each case - connect to different targets
          const branchEdges: Edge[] = [];
          
          // Find all potential target nodes (excluding entry and the router itself)
          const potentialTargets = currentNodes.filter(n => 
            n.id !== newNode.id && 
            n.data?.type !== 'entry'
          );
          
          cases.forEach((caseConfig: any, index: number) => {
            const caseName = caseConfig.case || `case${index + 1}`;
            
            let targetId: string | null = null;
            
            if (index === 0) {
              // First case (left edge) connects to return node (main flow)
              targetId = returnNode ? returnNode.id : (potentialTargets[0]?.id || null);
            } else {
              // Other cases connect to different nodes
              // Try to find a node that's not already a target
              const usedTargets = branchEdges.map(e => e.target);
              const availableTarget = potentialTargets.find(t => !usedTargets.includes(t.id));
              targetId = availableTarget?.id || returnNode?.id || potentialTargets[index % potentialTargets.length]?.id || null;
            }
            
            if (targetId) {
              // Create edge from conditional router to target
              const edge: Edge = {
                id: `${newNode.id}_${caseName}_${targetId}`,
                source: newNode.id,
                target: targetId,
                sourceHandle: caseName,
                type: "conditional",
                animated: true,
              };
              
              branchEdges.push(edge);
            }
          });
          
          // Add edges (they will be enriched automatically)
          branchEdges.forEach(edge => useNodesStore.getState().addEdge(edge));
        }
      }
      
      triggerAutoSave();
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to add node:`, error);
    }
  },
  
  removeNode: (nodeId: string) => {
    const { nodes } = useNodesStore.getState();
    const node = nodes.find(n => n.id === nodeId);
    
    if (node?.data?.type === 'entry' || node?.data?.type === 'return') {
      return;
    }
    
    useNodesStore.getState().removeNode(nodeId);
    useSelectionStore.getState().clearSelection();
    triggerAutoSave();
  },
  
  updateNode: (nodeId: string, updates: Partial<Node['data']>) => {
    useNodesStore.getState().updateNode(nodeId, updates);
    triggerAutoSave();
  },
  
  insertNodeBetweenEdge: async (edgeId: string, nodeType: string) => {
    try {
      const { nodes, edges } = useNodesStore.getState();
      const edge = edges.find(e => e.id === edgeId);
      
      if (!edge) {
        return;
      }
      
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) {
        return;
      }
      
      const centerX = (sourceNode.position.x + targetNode.position.x) / 2;
      const centerY = (sourceNode.position.y + targetNode.position.y) / 2;
      
      const newNode = await createNodeFromBackend(nodeType, { x: centerX, y: centerY });
      
      const newEdge1: Edge = {
        id: `${edge.source}-${newNode.id}`,
        source: edge.source,
        target: newNode.id,
        sourceHandle: edge.sourceHandle, // Preserve sourceHandle if present
        type: "step",
        animated: true,
      };
      
      const newEdge2: Edge = {
        id: `${newNode.id}-${edge.target}`,
        source: newNode.id,
        target: edge.target,
        type: "step",
        animated: true,
      };
      
      useNodesStore.getState().removeEdge(edgeId);
      useNodesStore.getState().addEdge(newEdge1);
      useNodesStore.getState().addEdge(newEdge2);
      useNodesStore.getState().addNodeAtPosition(newNode);
      useSelectionStore.getState().clearSelection();
      triggerAutoSave();
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to insert node:`, error);
    }
  },
  
  handleNodesChange: (changes) => {
    if (!changes || changes.length === 0) return;
    
    const { nodes, setNodes } = useNodesStore.getState();
    const filteredChanges = changes.filter((change: any) => {
      if (change.type === 'remove') {
        const node = nodes.find(n => n.id === change.id);
        if (node?.data?.type === 'entry' || node?.data?.type === 'return') {
          return false;
        }
      }
      return true;
    });
    
    if (filteredChanges.length > 0) {
      const updatedNodes = applyNodeChanges(filteredChanges, nodes);
      const nodesChanged = updatedNodes.length !== nodes.length || 
        updatedNodes.some((node, index) => {
          const oldNode = nodes[index];
          return !oldNode || 
            node.id !== oldNode.id || 
            node.position.x !== oldNode.position.x || 
            node.position.y !== oldNode.position.y ||
            JSON.stringify(node.data) !== JSON.stringify(oldNode.data);
        });
      
      if (nodesChanged) {
        setNodes(updatedNodes);
        triggerAutoSave();
      }
    }
  },
  
  handleEdgesChange: (changes) => {
    if (!changes || changes.length === 0) return;
    
    const { edges, setEdges } = useNodesStore.getState();
    const filtered = changes.filter((c: any) => c.type !== 'remove');
    
    if (filtered.length === 0) return;
    
    const updatedEdges = applyEdgeChanges(filtered, edges);
    const edgesChanged = updatedEdges.length !== edges.length ||
      updatedEdges.some((edge, index) => {
        const oldEdge = edges[index];
        return !oldEdge || edge.id !== oldEdge.id;
      });
    
    if (edgesChanged) {
      setEdges(updatedEdges);
      triggerAutoSave();
    }
  },
  
  handleConnect: (connection) => {
    const { nodes, edges, setEdges } = useNodesStore.getState();
    const newEdges = addEdgeUtil(connection, edges);
    // Enrich all edges (including the new one) with conditional case data
    const enrichedEdges = enrichEdges(newEdges, nodes);
    setEdges(enrichedEdges);
    triggerAutoSave();
  },
}));

