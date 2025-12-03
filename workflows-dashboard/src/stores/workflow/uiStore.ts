/**
 * Workflow UI Store
 * Manages UI-related state (code preview, loading, etc.)
 */

import { create } from "zustand";
import type { UIState } from "@/types/stores";

export const useUIStore = create<UIState>((set) => ({
  showCodePreview: false,
  backendCode: undefined,
  backendBindings: undefined,
  loading: false,
  mcpEnabled: false,
  
  setShowCodePreview: (show) => {
    set({ showCodePreview: show });
  },
  
  setBackendCode: (code) => {
    set({ backendCode: code });
  },
  
  setBackendBindings: (bindings) => {
    set({ backendBindings: bindings });
  },
  
  setLoading: (loading) => {
    set({ loading });
  },
  
  setMCPEnabled: (enabled) => {
    set({ mcpEnabled: enabled });
  },
}));

