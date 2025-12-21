import { BindingType, TemplateResolutionStatus } from "../../core/enums";

export interface CompilationOptions {
  enableLogging?: boolean;
  enableMCP?: boolean;
  className?: string;
  desiredWorkflowName?: string;
  workflowId?: string;
}

export interface CompilationResult {
  tsCode: string;
  wranglerConfig: string;
  bindings: Array<{
    name: string;
    type: BindingType;
    usage: Array<{
      nodeId: string;
      nodeLabel: string;
      nodeType: string;
    }>;
  }>;
  mcpManifest?: Record<string, unknown>;
  className: string;
  status: "success" | "error" | "warning";
  errors?: string[];
  warnings?: string[];
}

export interface TemplateResolutionResult {
  resolved: string;
  status: TemplateResolutionStatus;
  errors?: string[];
}

