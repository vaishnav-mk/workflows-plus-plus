'use client';

import { useMemo, useState } from 'react';
import type { Node } from 'reactflow';
import { Card, CardContent, Button, Spinner, Alert, AlertTitle } from '@/components';
import { JsonViewer } from '@/components/ui/JsonViewer';
import { useNodeExecution } from '@/hooks/useNodeExecution';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useNodeExecutionStore } from '@/stores/workflow/nodeExecutionStore';
import { ArrowRight } from 'lucide-react';

interface NodeExecutionPanelProps {
  node: Node;
}

export function NodeExecutionPanel({ node }: NodeExecutionPanelProps) {
  const { execute, loading, error } = useNodeExecution();
  const { nodes, edges } = useWorkflowStore();
  const { setExecution, clearExecution } = useNodeExecutionStore();

  const [inputData, setInputData] = useState<string>('{}');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const nodeType: string =
    typeof node.data?.type === 'string'
      ? node.data.type
      : typeof node.type === 'string'
      ? node.type
      : 'unknown';

  const nodeLabel: string =
    typeof node.data?.label === 'string'
      ? node.data.label
      : typeof node.type === 'string'
      ? node.type
      : node.id;

  // Only HTTP Request nodes are truly locally executable right now
  const supportsLocalExecution = nodeType === 'http-request';

  // If node cannot be locally tested, hide the panel entirely
  if (!supportsLocalExecution) {
    return null;
  }

  // Compute simple diagram of upstream data dependencies
  const incomingConnections = useMemo(() => {
    const incoming = edges.filter((e) => e.target === node.id);
    return incoming.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const sourceLabel =
        sourceNode && typeof sourceNode.data?.label === 'string'
          ? sourceNode.data.label
          : sourceNode?.id ?? edge.source;

      return {
        edgeId: edge.id,
        sourceId: edge.source,
        sourceLabel,
      };
    });
  }, [edges, nodes, node.id]);

  const handleExecute = async () => {
    setExecutionResult(null);
    setExecutionError(null);

    let parsedInput: any = {};
    try {
      parsedInput = JSON.parse(inputData || '{}');
    } catch {
      setExecutionError('Invalid JSON in input data');
      return;
    }

    const nodeConfig = node.data?.config || {};

    const result = await execute({
      type: nodeType,
      config: nodeConfig,
      inputData: parsedInput,
    });

    if (result.success) {
      const record = {
        nodeId: node.id,
        nodeType,
        nodeLabel,
        input: parsedInput,
        output: result.output,
        logs: result.logs || [],
        success: true,
        error: undefined,
        executedAt: Date.now(),
      };

      setExecution(record);
      setExecutionResult(result);
    } else {
      const record = {
        nodeId: node.id,
        nodeType,
        nodeLabel,
        input: parsedInput,
        output: undefined,
        logs: result.logs || [],
        success: false,
        error: result.error,
        executedAt: Date.now(),
      };

      setExecution(record);
      setExecutionError(result.error || 'Execution failed');
    }
  };

  const handleClear = () => {
    setExecutionResult(null);
    setExecutionError(null);
    setInputData('{}');
    clearExecution(node.id);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-4">
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

        {/* Simple data dependency diagram */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">
            Data Dependencies
          </label>
          {incomingConnections.length === 0 ? (
            <p className="text-xs text-gray-500">
              This node currently has no upstream data dependencies. It will receive the test input you provide below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              {incomingConnections.map((conn) => (
                <div
                  key={conn.edgeId}
                  className="flex items-center text-[11px] text-gray-700 bg-gray-50 border border-gray-200 rounded-full px-2 py-1"
                >
                  <span className="font-medium mr-1">{conn.sourceLabel}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 mx-1" />
                  <span className="font-medium">{nodeLabel}</span>
                </div>
              ))}
            </div>
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
            Provide test input data as JSON. For nodes with upstream connections, this represents the payload they would receive from previous nodes.
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
      </CardContent>
    </Card>
  );
}

