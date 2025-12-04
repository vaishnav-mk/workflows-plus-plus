import { create } from "zustand";

interface NodeExecutionRecord {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  input: any;
  output: any;
  logs: string[];
  success: boolean;
  error?: string;
  executedAt: number;
}

interface NodeExecutionState {
  executions: Record<string, NodeExecutionRecord>;
  setExecution: (record: NodeExecutionRecord) => void;
  clearExecution: (nodeId: string) => void;
  clearAll: () => void;
}

export const useNodeExecutionStore = create<NodeExecutionState>((set) => ({
  executions: {},
  setExecution: (record) =>
    set((state) => ({
      executions: {
        ...state.executions,
        [record.nodeId]: record,
      },
    })),
  clearExecution: (nodeId) =>
    set((state) => {
      const { [nodeId]: _removed, ...rest } = state.executions;
      return { executions: rest };
    }),
  clearAll: () => set({ executions: {} }),
}));


