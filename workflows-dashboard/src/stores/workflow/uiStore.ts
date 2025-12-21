import { create } from "zustand";
import type { UIState } from "@/types/stores";

export const useUIStore = create<UIState>((set) => ({
  showCodePreview: false,
  backendCode: "",
  backendBindings: [],
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
