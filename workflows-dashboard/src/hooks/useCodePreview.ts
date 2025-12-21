import { useState, useCallback } from 'react';
import { useCompileWorkflowMutation } from './useWorkflowsQuery';
import type { CompileWorkflowRequest, WorkflowNode, WorkflowEdge } from '@/lib/api/types';

export function useCodePreview() {
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [backendCode, setBackendCode] = useState("");
  const [backendBindings, setBackendBindings] = useState<Array<{ name: string; type: string }>>([]);
  const compileWorkflowMutation = useCompileWorkflowMutation();

  const handleCodePreview = useCallback(async (nodes: any[], edges: any[], workflowId: string) => {
    try {
      const workflow: CompileWorkflowRequest = {
        name: "Workflow",
        nodes: nodes.map((n): WorkflowNode => {
          const nodeType = (n.data?.type || n.type || "");
          const nodeLabel = (n.data?.label || "");
          const nodeConfig = (n.data?.config && typeof n.data.config === "object" ? n.data.config : {});
          return {
            id: n.id,
            type: nodeType,
            data: {
              label: nodeLabel,
              type: nodeType,
              config: nodeConfig,
              ...n.data
            },
            config: nodeConfig
          };
        }),
        edges: edges.map((e): WorkflowEdge => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || null,
          targetHandle: e.targetHandle || null
        })),
        options: workflowId ? { workflowId } : {}
      };
      
      const result = await compileWorkflowMutation.mutateAsync(workflow);
      if (result) {
        setBackendCode(result.tsCode);
        setBackendBindings(result.bindings);
      } else {
        setBackendCode("");
        setBackendBindings([]);
      }
    } catch {
      setBackendCode("");
      setBackendBindings([]);
    }
    setShowCodePreview(true);
  }, [compileWorkflowMutation]);

  const closeCodePreview = useCallback(() => {
    setShowCodePreview(false);
  }, []);

  return {
    showCodePreview,
    backendCode,
    backendBindings,
    handleCodePreview,
    closeCodePreview,
    isLoading: compileWorkflowMutation.isPending,
    error: compileWorkflowMutation.error,
  };
}
