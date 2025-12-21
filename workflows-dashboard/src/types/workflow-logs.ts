export interface WorkflowTailBottomSheetProps {
  workflowName: string;
  instanceId: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (status: any) => void;
}

export interface LogEntry {
  id: string;
  type: string;
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  timestamp: number;
  message?: string;
  output?: any;
  error?: string;
  success?: boolean;
  status?: any;
}

