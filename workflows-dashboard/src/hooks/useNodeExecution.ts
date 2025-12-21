import { useCallback } from "react";
import { useExecuteNodeMutation } from './useWorkflowsQuery';

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

export function useNodeExecution(): UseNodeExecutionReturn {
  const executeNodeMutation = useExecuteNodeMutation();

  const execute = useCallback(async (input: ExecutionInput): Promise<
    ExecutionResult
  > => {
    try {
      const result = await executeNodeMutation.mutateAsync(input);
      const output = (result && typeof result === "object" && "output" in result ? result.output : null);
      const logs = (result && typeof result === "object" && "logs" in result && Array.isArray(result.logs) ? result.logs : []);
      return {
        success: true,
        output: output,
        logs: logs
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Execution failed";
      return {
        success: false,
        error: errorMessage,
        logs: []
      };
    }
  }, [executeNodeMutation]);

  return {
    execute,
    loading: executeNodeMutation.isPending,
    error: executeNodeMutation.error instanceof Error ? executeNodeMutation.error.message : (executeNodeMutation.error ? String(executeNodeMutation.error) : null)
  };
}
