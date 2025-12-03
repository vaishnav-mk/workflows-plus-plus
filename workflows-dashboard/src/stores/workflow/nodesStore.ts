import { create } from "zustand";
import type { Node, Edge } from "reactflow";
import type { NodesState } from "@/types/stores";
import { useSelectionStore } from "@/stores/workflow/selectionStore";
import { getLayoutedNodes } from "@/utils/layout";

export const useNodesStore = create<NodesState>((set, get) => ({
  nodes: [],
  edges: [],
  
  setNodes: (nodes) => {
    const { edges } = get();
    const layoutedNodes = getLayoutedNodes(nodes, edges);
    set({ nodes: layoutedNodes });
  },
  
  setEdges: (edges) => {
    const edgesWithType = edges.map(edge => ({
      ...edge,
      type: edge.type || 'step',
    }));
    set({ edges: edgesWithType });
    // Recalculate layout when edges change
    const { nodes } = get();
    const layoutedNodes = getLayoutedNodes(nodes, edgesWithType);
    set({ nodes: layoutedNodes });
  },
  
  addNode: (node) => {
    set((state) => {
      const newNodes = [...state.nodes, node];
      const layoutedNodes = getLayoutedNodes(newNodes, state.edges);
      return { nodes: layoutedNodes };
    });
  },
  
  addNodeAtPosition: (node: Node) => {
    set((state) => {
      const newNodes = [...state.nodes, node];
      const layoutedNodes = getLayoutedNodes(newNodes, state.edges);
      return { nodes: layoutedNodes };
    });
  },
  
  removeNode: (nodeId) => {
    set((state) => {
      const nodeToDelete = state.nodes.find((n) => n.id === nodeId);
      if (!nodeToDelete) return state;
      
      const newNodes = state.nodes.filter((n) => n.id !== nodeId);
      const incomingEdges = state.edges.filter((e) => e.target === nodeId);
      const outgoingEdges = state.edges.filter((e) => e.source === nodeId);
      const edgesToRemoveIds = new Set(
        state.edges
          .filter((e) => e.source === nodeId || e.target === nodeId)
          .map((e) => e.id)
      );
      let newEdges = state.edges.filter((e) => !edgesToRemoveIds.has(e.id));
      
      if (incomingEdges.length > 0 && outgoingEdges.length > 0) {
        incomingEdges.forEach((incoming) => {
          outgoingEdges.forEach((outgoing) => {
            const newEdgeId = `${incoming.source}-${outgoing.target}`;
            if (!newEdges.some(e => e.source === incoming.source && e.target === outgoing.target)) {
              newEdges.push({
                id: newEdgeId,
                source: incoming.source,
                target: outgoing.target,
                type: 'step',
                animated: true,
              });
            }
          });
        });
      }
      
      const layoutedNodes = getLayoutedNodes(newNodes, newEdges);
      return { nodes: layoutedNodes, edges: newEdges };
    });
  },
  
  updateNode: (nodeId, updates) => {
    set((state) => {
      const updatedNodes = state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
      );
      
      const selectedNode = useSelectionStore.getState().selectedNode;
      if (selectedNode && selectedNode.id === nodeId) {
        const updatedNode = updatedNodes.find(n => n.id === nodeId);
        if (updatedNode) {
          useSelectionStore.getState().setSelectedNode(updatedNode);
        }
      }
      
      return { nodes: updatedNodes };
    });
  },
  
  addEdge: (edge) => {
    set((state) => {
      // Ensure edge has 'step' type for straight lines
      const edgeWithType = {
        ...edge,
        type: edge.type || 'step',
      };
      const newEdges = [...state.edges, edgeWithType];
      // Recalculate layout when edges change
      const layoutedNodes = getLayoutedNodes(state.nodes, newEdges);
      return { edges: newEdges, nodes: layoutedNodes };
    });
  },
  
  removeEdge: (edgeId) => {
    set((state) => {
      const newEdges = state.edges.filter((e) => e.id !== edgeId);
      // Recalculate layout when edges change
      const layoutedNodes = getLayoutedNodes(state.nodes, newEdges);
      return { edges: newEdges, nodes: layoutedNodes };
    });
  },
  
  updateEdge: (edgeId, updates) => {
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, ...updates } : e
      ),
    }));
  },
}));

