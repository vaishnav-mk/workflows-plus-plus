/**
 * Workflow Selection Store
 * Manages selected node and edge state
 */

import { create } from "zustand";
import type { Node, Edge } from "reactflow";
import type { SelectionState } from "@/types/stores";

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNode: null,
  selectedEdge: null,
  
  setSelectedNode: (node) => {
    set({ selectedNode: node, selectedEdge: null });
  },
  
  setSelectedEdge: (edge) => {
    set({ selectedEdge: edge, selectedNode: null });
  },
  
  clearSelection: () => {
    set({ selectedNode: null, selectedEdge: null });
  },
}));


