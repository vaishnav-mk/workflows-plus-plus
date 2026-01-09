export interface ResourceItem {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface ResourceSelectorConfig {
  label: string;
  placeholder: string;
  createLabel?: string;
  createPlaceholder?: string;
  loadingText: string;
  getId: (resource: any) => string;
  getName: (resource: any) => string;
  getDisplayLabel: (resource: any) => string;
  loadResources: () => Promise<any[]>;
  createResource?: (name: string) => Promise<any>;
  validateCreateName?: (name: string) => string | null;
  transformCreateName?: (name: string) => string;
  configFields: {
    idField: string;
    nameField: string;
  };
  additionalActions?: Array<{
    label: string;
    onClick: (selectedId: string, selectedName: string) => void;
    disabled?: (selectedId: string) => boolean;
    loading?: boolean;
  }>;
  additionalContent?: (selectedId: string, selectedName: string) => React.ReactNode;
  customManagerLink?: {
    href: (selectedId: string, nodeId: string, workflowId: string | null) => string;
    label: string;
  };
}

export interface ResourceSelectorProps {
  nodeData: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  nodeId: string;
  config: ResourceSelectorConfig;
}

