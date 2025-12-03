'use client';

import { useState } from 'react';
import type { Node } from 'reactflow';
import { Card, CardContent, Button, Input, Spinner, Alert, AlertTitle } from '@/components';
import { JsonViewer } from '@/components/ui/JsonViewer';
import { useNodeExecution } from '@/hooks/useNodeExecution';

interface NodeExecutionPanelProps {
  node: Node;
}

export function NodeExecutionPanel({ node }: NodeExecutionPanelProps) {
  const { execute, loading, error } = useNodeExecution();
  const [inputData, setInputData] = useState<string>('{}');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const handleExecute = async () => {
    setExecutionResult(null);
    setExecutionError(null);

    let parsedInput: any = {};
    try {
      parsedInput = JSON.parse(inputData || '{}');
    } catch (e) {
      setExecutionError('Invalid JSON in input data');
      return;
    }

    const nodeType: string = typeof node.data?.type === 'string' ? node.data.type : (typeof node.type === 'string' ? node.type : 'unknown');
    const nodeConfig = node.data?.config || {};

    const result = await execute({
      type: nodeType,
      config: nodeConfig,
      inputData: parsedInput
    });

    if (result.success) {
      setExecutionResult(result);
    } else {
      setExecutionError(result.error || 'Execution failed');
    }
  };

  const handleClear = () => {
    setExecutionResult(null);
    setExecutionError(null);
    setInputData('{}');
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Test Node Execution
            </h3>
            {executionResult && (
              <button
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">
              Input Data (JSON)
            </label>
            <textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#056DFF]"
              rows={4}
              placeholder='{"key": "value"}'
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Provide test input data as JSON
            </p>
          </div>

          <Button
            onClick={handleExecute}
            disabled={loading}
            variant="primary"
            className="w-full"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Executing...
              </>
            ) : (
              'Execute Node'
            )}
          </Button>

          {executionError && (
            <Alert variant="error">
              <AlertTitle>Execution Error</AlertTitle>
              {executionError}
            </Alert>
          )}

          {error && (
            <Alert variant="error">
              <AlertTitle>Error</AlertTitle>
              {error}
            </Alert>
          )}

          {executionResult && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700">Output</h4>
              <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                <JsonViewer data={executionResult.output || executionResult} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
