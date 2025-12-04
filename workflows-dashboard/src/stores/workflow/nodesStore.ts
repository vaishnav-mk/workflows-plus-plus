import { create } from "zustand";
import type { Node, Edge } from "reactflow";
import type { NodesState } from "@/types/stores";
import { useSelectionStore } from "@/stores/workflow/selectionStore";
import { getLayoutedNodes } from "@/utils/layout";
import { enrichEdges, enrichEdge } from "./edgeEnrichment";

export const useNodesStore = create<NodesState>((set, get) => ({
  nodes: [],
  edges: [],
  
  setNodes: (nodes) => {
    const { edges } = get();
    const layoutedNodes = getLayoutedNodes(nodes, edges);
    set({ nodes: layoutedNodes });
  },
  
  setEdges: (edges) => {
    const { nodes } = get();
    const enrichedEdges = enrichEdges(edges, nodes);
    set({ edges: enrichedEdges });
    // Recalculate layout when edges change
    const layoutedNodes = getLayoutedNodes(nodes, enrichedEdges);
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
      
      // Re-enrich all edges if node config changed (especially for conditional routers)
      const enrichedEdges = enrichEdges(state.edges, updatedNodes);
      return { nodes: updatedNodes, edges: enrichedEdges };
    });
  },
  
  addEdge: (edge) => {
    set((state) => {
      const sourceNode = state.nodes.find(n => n.id === edge.source);
      const enrichedEdge = enrichEdge(edge, sourceNode, [...state.edges, edge]);
      const newEdges = [...state.edges, enrichedEdge];
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
    set((state) => {
      const updatedEdges = state.edges.map((e) =>
        e.id === edgeId ? { ...e, ...updates } : e
      );
      // Re-enrich edges after update (in case sourceHandle changed)
      const enrichedEdges = enrichEdges(updatedEdges, state.nodes);
      return { edges: enrichedEdges };
    });
  },
}));

