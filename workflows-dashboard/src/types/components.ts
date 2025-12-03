import { type ColumnDef } from "@tanstack/react-table";
import { type DetailItem } from "@/components/ui/DetailsList";
import type { Node, Edge, Connection } from "reactflow";
import type { WorkflowDefinition } from './workflow';

// Page components
export interface PageHeaderProps {
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  onRowAction?: (row: TData, action?: string) => void;
}

export interface ExpandableTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  getRowId: (row: TData) => string;
  renderExpandedRow: (row: TData) => React.ReactNode;
  expandedRows?: Set<string>;
  onToggleExpand?: (rowId: string) => void;
  renderExpandedContent?: (row: TData) => React.ReactNode;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  infoTooltip?: string;
}

export interface StatItem {
  label?: string;
  value: string | number;
  icon?: React.ReactNode;
  title?: string;
  infoTooltip?: string;
}

export interface UsageStatsPanelProps {
  stats: StatItem[];
  title?: string;
  dateRange?: string;
}

export interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  defaultValue?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalItems?: number;
  showPageSizeSelector?: boolean;
  itemsPerPage?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  onFirst?: () => void;
  currentItems?: number;
  totalItemsCount?: number;
  clientItemsPerPage?: number;
  onItemsPerPageChange?: (size: number) => void;
  showItemsPerPage?: boolean;
}


// Workflow components
export interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (params: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
}

export interface WorkflowNodeProps {
  id: string;
  data: {
    label: string;
    type: string;
    icon?: string;
    status?: string;
    config?: Record<string, unknown>;
  };
  selected: boolean;
  style?: React.CSSProperties;
}

export interface WorkflowSidebarProps {
  onAddNode: (nodeType: string) => void;
  nodes: Node[];
  edges: Edge[];
  edgeSelected: boolean;
}

export interface NodePaletteProps {
  onAddNode: (type: string) => void;
  disabled?: boolean;
  edgeSelected?: boolean;
}

export interface WorkflowSettingsPanelProps {
  selectedNode: Node | null;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  onClose: () => void;
}

export interface WorkflowToolbarProps {
  onCompile?: () => void;
  onDeploy?: () => void;
  onSave?: () => void;
  isLoading?: boolean;
}

export interface NodeExecutionPanelProps {
  nodeId: string;
  onClose: () => void;
}

export interface WorkflowTailBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId?: string;
}

// Settings components
export interface DynamicSettingsRendererProps {
  fields: any[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export interface ConditionalBuilderProps {
  value: any;
  onChange: (value: any) => void;
}

export interface RetryConfigSectionProps {
  value: any;
  onChange: (value: any) => void;
}

// UI components
export interface SettingInputProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
}

export interface SettingCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export interface SettingButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export interface SettingTextProps {
  content: string;
}

export interface SettingTextareaProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
}

export interface SettingSelectProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
}

export interface TemplateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  availablePorts?: any[];
}

export interface TemplateBadgeProps {
  text: string;
  onRemove?: () => void;
}

export interface JsonViewerProps {
  data: any;
  title?: string;
}

// Code Preview
export interface NodeUsage {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  namespace?: {
    configured: string | null;
    default: string;
    resolved: string;
    finalBinding: string;
  };
  database?: {
    configured: string | null;
    default: string;
    resolved: string;
  };
  key?: string;
  type?: string;
  valueType?: string;
  query?: string;
  returnType?: string;
  options?: any;
  parameters?: any[];
}

export interface Binding {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  usedBy?: string[];
  usage?: NodeUsage[];
  nodeCount?: number;
  nodes?: Array<{
    id: string;
    label: string;
    type: string;
  }>;
}

export interface ParsedNode {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  startLine: number;
  endLine: number;
  color?: string;
}

export interface CodePreviewProps {
  workflow: WorkflowDefinition;
  isOpen: boolean;
  onClose: () => void;
  code?: string;
  bindings?: Binding[];
  nodes?: Node[];
  onNodeSelect?: (nodeId: string) => void;
}


// Log components
export interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
  nodeId?: string;
  data?: any;
}

// State view
export interface StateTreeNode {
  id: string;
  label: string;
  value: any;
  children?: StateTreeNode[];
}

// Toast components
export interface ToastProps {
  toast: import('./ui').Toast;
  onRemove: (id: string) => void;
}

export interface ToastContainerProps {
  toasts: import('./ui').Toast[];
  onRemove: (id: string) => void;
}
