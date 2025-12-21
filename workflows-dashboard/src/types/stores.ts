import type { Node, Edge } from "reactflow";
import type { Toast } from "./ui";

export interface NodesState {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  addNodeAtPosition: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<Node['data']>) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  updateEdge: (edgeId: string, updates: Partial<Edge>) => void;
}

export interface SelectionState {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  setSelectedNode: (node: Node | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;
  clearSelection: () => void;
}

export interface UIState {
  showCodePreview: boolean;
  backendCode: string;
  backendBindings: Array<{ name: string; type: string }>;
  loading: boolean;
  mcpEnabled: boolean;
  setShowCodePreview: (show: boolean) => void;
  setBackendCode: (code: string) => void;
  setBackendBindings: (bindings: Array<{ name: string; type: string }>) => void;
  setLoading: (loading: boolean) => void;
  setMCPEnabled: (enabled: boolean) => void;
}

export interface ActionsState {
  addNode: (nodeType: string) => Promise<void>;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<Node['data']>) => void;
  insertNodeBetweenEdge: (edgeId: string, nodeType: string) => Promise<void>;
  handleNodesChange: (changes: Parameters<typeof import('reactflow').applyNodeChanges>[0]) => void;
  handleEdgesChange: (changes: Parameters<typeof import('reactflow').applyEdgeChanges>[0]) => void;
  handleConnect: (connection: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) => void;
}

export interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}
