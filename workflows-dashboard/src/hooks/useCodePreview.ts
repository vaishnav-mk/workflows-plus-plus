import { useState, useCallback } from 'react';
import { useApi } from './useApi';

export function useCodePreview() {
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [backendCode, setBackendCode] = useState<string | undefined>(undefined);
  const { generateCode } = useApi();

  const handleCodePreview = useCallback(async (nodes: any[], edges: any[]) => {
    try {
      const result = await generateCode(nodes, edges);
      if (result.data?.data?.workerTs) {
        setBackendCode(result.data.data.workerTs);
      } else {
        setBackendCode(undefined);
      }
    } catch (e) {
      setBackendCode(undefined);
    }
    setShowCodePreview(true);
  }, [generateCode]);

  const closeCodePreview = useCallback(() => {
    setShowCodePreview(false);
  }, []);

  return {
    showCodePreview,
    backendCode,
    handleCodePreview,
    closeCodePreview
  };
}
