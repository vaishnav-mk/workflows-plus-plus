import { useState, useCallback } from "react";

interface ExecutionInput {
  type: string;
  config: any;
  inputData?: any;
}

interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  logs?: string[];
}

interface UseNodeExecutionReturn {
  execute: (input: ExecutionInput) => Promise<ExecutionResult>;
  loading: boolean;
  error: string | null;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787/api";

export function useNodeExecution(): UseNodeExecutionReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (input: ExecutionInput): Promise<
    ExecutionResult
  > => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/nodes/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.error || "Execution failed");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Execution failed";
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
        logs: []
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    execute,
    loading,
    error
  };
}
