import { useState, useCallback } from 'react';
import { useCompileWorkflowMutation } from './useWorkflowsQuery';

export function useCodePreview() {
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [backendCode, setBackendCode] = useState<string | undefined>(undefined);
  const [backendBindings, setBackendBindings] = useState<any[] | undefined>(undefined);
  const compileWorkflowMutation = useCompileWorkflowMutation();

  const handleCodePreview = useCallback(async (nodes: any[], edges: any[], workflowId?: string) => {
    try {
      const workflow = {
        name: "Workflow",
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.data?.type || n.type,
          data: n.data,
          config: n.data?.config,
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
        options: workflowId ? { workflowId } : undefined,
      };
      
      const result = await compileWorkflowMutation.mutateAsync(workflow);
      if (result) {
        setBackendCode(result.tsCode);
        setBackendBindings(result.bindings);
      } else {
        setBackendCode(undefined);
        setBackendBindings(undefined);
      }
    } catch (e) {
      setBackendCode(undefined);
      setBackendBindings(undefined);
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
