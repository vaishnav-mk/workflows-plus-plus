'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useInstanceQuery, useWorkerVersionQuery, useWorkerVersionsQuery } from '@/hooks/useWorkflowsQuery';
import { apiClient } from '@/lib/api-client';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { WorkflowTailBottomSheet } from '@/components/workflow/WorkflowTailBottomSheet';
import { Spinner } from '@/components';
import { PageHeader, Card, CardHeader, CardContent, Badge, Button, CopyButton, DataTable, Alert, AlertTitle } from '@/components';
import { type ColumnDef } from '@tanstack/react-table';
import { applyNodeChanges, applyEdgeChanges, type Node, type Edge, type Connection } from 'reactflow';
import { JsonViewer } from '@/components/ui/JsonViewer';

interface InstanceDetail {
  trigger?: {
    source?: string;
  };
  versionId?: string;
  queued?: string;
  start?: string;
  end?: string;
  success?: boolean;
  error?: {
    message?: string;
    name?: string;
  } | string;
  status: string;
  steps?: Array<{
    name: string;
    start: string;
    end: string | null;
    success: boolean | null;
    output?: any;
    error?: {
      message?: string;
      name?: string;
    };
    type?: string;
    config?: {
      retries?: {
        limit?: number;
        delay?: number;
        backoff?: string;
      };
      timeout?: string;
    };
    attempts?: Array<{
      start: string;
      end: string;
      success: boolean;
      error?: {
        message?: string;
        name?: string;
      };
    }>;
  }>;
}

export default function InstanceDetailPage() {
  const params = useParams();
  const workflowName = params.workflowId as string;
  const instanceId = params.instanceId as string;
  
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  
  const { data: instance, isLoading: instanceLoading, error: queryError } = useInstanceQuery(workflowName, instanceId);
  const error = queryError instanceof Error ? queryError.message : (queryError ? String(queryError) : null);
  
  const workerId = `${workflowName}-worker`;
  const { data: versionsResult, isLoading: versionsLoading } = useWorkerVersionsQuery(workerId, 1, 100);
  
  const latestVersion = useMemo(() => {
    if (!versionsResult?.data || versionsResult.data.length === 0) return null;
    const sorted = [...versionsResult.data].sort((a: any, b: any) => {
      if (a.number !== undefined && b.number !== undefined) return b.number - a.number;
      if (a.created_on && b.created_on) {
        return new Date(b.created_on).getTime() - new Date(a.created_on).getTime();
      }
      return 0;
    });
    return sorted[0];
  }, [versionsResult?.data]);
  
  const { data: version, isLoading: versionLoading, error: versionError } = useWorkerVersionQuery(
    workerId,
    latestVersion?.id || '',
    'modules'
  );
  
  const onNodesChange = useCallback((changes: any[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds) as Node[]);
  }, []);
  
  const onEdgesChange = useCallback((changes: any[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds) as Edge[]);
  }, []);
  
  const onConnect = useCallback((_connection: Connection) => {
    // Read-only view, no connections allowed
  }, []);
  
  const findStepForNode = useCallback((node: Node, steps: InstanceDetail['steps'] = []) => {
    if (!node?.id) return undefined;
    
    const nodeId = node.id;
    const stepNameMatch = nodeId.match(/step_(\w+)_(\d+)/);
    
    if (stepNameMatch) {
      const [, type, num] = stepNameMatch;
      const candidates = [
        `step_${type}_${num}-1`,
        `step_${type}_${num}`,
        `${type}-${num}`,
      ];
      
      for (const candidate of candidates) {
        const step = steps.find((s: any) => s.name === candidate || s.name.includes(nodeId));
        if (step) return step;
      }
    }
    
    return steps.find((s: any) => s.name.includes(nodeId) || (node.data?.label && s.name.includes(node.data.label)));
  }, []);
  
  type StepType = NonNullable<InstanceDetail['steps']>[number];
  
  const getStepStatus = useCallback((step: StepType | undefined, instanceData: InstanceDetail) => {
    if (!step) {
      const status = instanceData?.status?.toLowerCase();
      if (status === 'complete' || status === 'completed' || instanceData?.success === true) return 'completed';
      if (status === 'running' || status === 'queued') return 'running';
      if (status === 'errored' || status === 'failed') return 'failed';
      return 'pending';
    }
    
    if (step.success === true) return 'completed';
    if (step.success === false) return 'failed';
    
    const retryLimit = step.config?.retries?.limit || 0;
    const attempts = step.attempts || [];
    const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
    const allRetriesExhausted = attempts.length >= retryLimit && retryLimit > 0;
    
    if (allRetriesExhausted && lastAttempt && lastAttempt.success === false) return 'failed';
    if (step.end === null || step.end === undefined) return 'running';
    if (lastAttempt && lastAttempt.success === false) return 'failed';
    
    return 'pending';
  }, []);
  
  useEffect(() => {
    if (instance?.status && (instance.status.toLowerCase() === 'running' || instance.status.toLowerCase() === 'queued')) {
      setIsLogsOpen(true);
    }
  }, [instance?.status]);

  useEffect(() => {
    const loadWorkflow = async () => {
      if (!version?.modules || version.modules.length === 0 || nodes.length > 0) return;

      setWorkflowLoading(true);
      setWorkflowError(null);

      try {
        const mainModule = version.modules.find(
          (m: any) => m.name.endsWith('.ts') || m.name.endsWith('.js') || m.name.endsWith('.mjs')
        ) || version.modules[0];

        if (!mainModule?.content_base64) {
          setWorkflowError('No code module found in version');
          setWorkflowLoading(false);
          return;
        }

        const workflowCode = atob(mainModule.content_base64);
        const result = await apiClient.reverseCodegen(workflowCode);

        if (!result.success || !result.data) {
          throw new Error(result.error || result.message || 'Failed to parse workflow code');
        }

        if (result.data.nodes && result.data.edges) {
          // Arrange nodes vertically with proper spacing
          const nodesWithPositions = result.data.nodes.map((node: any, index: number) => ({
            ...node,
            position: node.position || { x: 400, y: index * 200 },
            type: 'workflow',
          }));
          
          setNodes(nodesWithPositions as Node[]);
          setEdges(result.data.edges as Edge[]);
        }
      } catch (err) {
        console.error('Failed to load workflow:', err);
        setWorkflowError(err instanceof Error ? err.message : 'Failed to load workflow');
      } finally {
        setWorkflowLoading(false);
      }
    };

    loadWorkflow();
  }, [version, nodes.length]);

  useEffect(() => {
    if (!instance || nodes.length === 0) return;
    
    setNodes((currentNodes) => {
      // Find the index of the first failed node
      let failedNodeIndex = -1;
      for (let i = 0; i < currentNodes.length; i++) {
        const step = findStepForNode(currentNodes[i], instance.steps);
        if (step && step.success === false) {
          failedNodeIndex = i;
          break;
        }
      }
      
      return currentNodes.map((node, nodeIndex) => {
        const step = findStepForNode(node, instance.steps);
        
        // If this node is before a failed node and has no step, mark it as successful
        let status: string;
        if (failedNodeIndex !== -1 && nodeIndex < failedNodeIndex && !step) {
          // Node before failed node, mark as successful
          status = 'completed';
        } else {
          status = getStepStatus(step, instance);
        }
        
        const backgroundColor = 
          status === 'completed' ? '#10b981' :
          status === 'failed' ? '#FECCC8' :
          status === 'running' ? '#3b82f6' :
          '#fbbf24';
        
        const description = step
          ? `Start: ${step.start ? new Date(step.start).toLocaleTimeString() : '—'} | End: ${step.end ? new Date(step.end).toLocaleTimeString() : '—'}`
          : (node.data?.description || 'Workflow node');

        return {
          ...node,
          style: {
            ...(node.style || {}),
            backgroundColor,
            color: (status === 'completed' || status === 'failed' || status === 'running') ? 'white' : 'black',
            border: '2px solid #374151',
            borderRadius: '8px',
          },
          data: {
            ...node.data,
            description,
            status,
            stepInfo: step,
          }
        };
      });
    });
  }, [instance, nodes.length, findStepForNode, getStepStatus]);

  if (instanceLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-gray-600">Loading workflow instance...</p>
        </div>
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <AlertTitle>Error</AlertTitle>
          {error || 'Instance not found'}
        </Alert>
      </div>
    );
  }

  const isWorkflowLoading = versionLoading || workflowLoading || versionsLoading;
  const hasWorkflowError = versionError || workflowError;

  const stepColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'success',
      header: 'Status',
      cell: ({ row }) => {
        const step = row.original;
        let status = 'pending';
        let variant: 'success' | 'error' | 'info' = 'info';
        
        if (step.success === true) {
          status = 'Completed';
          variant = 'success';
        } else if (step.success === false) {
          status = 'Failed';
          variant = 'error';
        } else if (step.end === null || step.end === undefined) {
          status = 'Running';
          variant = 'info';
        } else {
          status = 'Pending';
          variant = 'info';
        }
        
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: 'name',
      header: 'Step',
      cell: ({ row }) => (
        <div className="text-sm font-medium text-gray-900">{row.original.name}</div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="info">{row.original.type || 'step'}</Badge>
      ),
    },
    {
      id: 'start',
      header: 'Start Time',
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {row.original.start ? new Date(row.original.start).toLocaleString() : 'N/A'}
        </div>
      ),
    },
    {
      id: 'end',
      header: 'End Time',
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {row.original.end ? new Date(row.original.end).toLocaleString() : 'N/A'}
        </div>
      ),
    },
    {
      id: 'duration',
      header: 'Duration',
      cell: ({ row }) => {
        const duration = row.original.start && row.original.end
          ? Math.round((new Date(row.original.end).getTime() - new Date(row.original.start).getTime()))
          : null;
        return <div className="text-sm text-gray-900">{duration ? `${duration} ms` : 'N/A'}</div>;
      },
    },
    {
      id: 'attempts',
      header: 'Attempts',
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">{row.original.attempts?.length || 1}</div>
      ),
    },
  ];

  const selectedStep = selectedNode ? findStepForNode(selectedNode, instance.steps) : undefined;

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-6 py-8">
        <PageHeader
          title={`Instance ${instanceId.substring(0, 8)}...`}
          description="Workflow execution details and step history"
          secondaryAction={{
            label: '← Back to Workflows',
            onClick: () => window.location.href = '/workflows',
          }}
        />

        <div className="grid grid-cols-12 gap-6 mt-6">
          <div className="col-span-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Workflow Execution</h2>
                  {isWorkflowLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Spinner size="sm" />
                      <span>Loading workflow...</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {hasWorkflowError && (
                  <Alert variant="error" className="mb-4">
                    <AlertTitle>Workflow Loading Error</AlertTitle>
                    {workflowError || (versionError instanceof Error ? versionError.message : String(versionError))}
                    <p className="text-sm mt-2 text-gray-600">
                      Instance data is shown below. The workflow visualization may be incomplete.
                    </p>
                  </Alert>
                )}
                {nodes.length === 0 && !isWorkflowLoading && !hasWorkflowError && (
                  <Alert variant="info" className="mb-4">
                    <AlertTitle>Workflow Not Loaded</AlertTitle>
                    <p className="text-sm mt-2 text-gray-600">
                      Workflow visualization is not available. Instance data is shown below.
                    </p>
                  </Alert>
                )}
                <div style={{ height: '600px', width: '100%', minHeight: '600px' }}>
                  <WorkflowCanvas
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={(_, node) => setSelectedNode(node)}
                    onEdgeClick={() => undefined}
                  />
                </div>
                <div className="mt-4 flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FECCC8' }}></div>
                    <span>Failed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Running</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span>Pending</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-4">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Node Details</h3>
              </CardHeader>
              <CardContent>
                {!selectedNode ? (
                  <div className="text-sm text-gray-500">Select a node to see details</div>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900">
                          {String(selectedNode.data?.label || selectedNode.type || 'Node')}
                        </div>
                        <Badge variant={selectedStep?.success ? 'success' : 'error'}>
                          {selectedStep?.success ? 'Completed' : selectedStep?.success === false ? 'Failed' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        {String(selectedNode.data?.type || 'unknown')} • {selectedStep?.start ? new Date(selectedStep.start).toLocaleTimeString() : '—'} - {selectedStep?.end ? new Date(selectedStep.end).toLocaleTimeString() : '—'}
                      </div>
                    </div>
                    
                    {selectedStep && (
                      <>
                        {selectedStep.error && (
                          <div>
                            <div className="text-gray-700 font-medium mb-2">Error</div>
                            <div className="bg-red-50 border border-red-200 rounded p-3">
                              <div className="text-sm font-medium text-red-900 mb-1">
                                {typeof selectedStep.error === 'object' ? (selectedStep.error.name || 'Error') : 'Error'}
                              </div>
                              <div className="text-sm text-red-700">
                                {typeof selectedStep.error === 'object' ? (selectedStep.error.message || 'Unknown error') : String(selectedStep.error)}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-gray-700 font-medium">Input</div>
                            {selectedStep.output && (
                              <CopyButton
                                text={typeof selectedStep.output === 'string' ? selectedStep.output : JSON.stringify(selectedStep.output, null, 2)}
                              />
                            )}
                          </div>
                          {selectedStep.output ? (
                            <JsonViewer data={selectedStep.output} className="max-h-96" />
                          ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-500">
                              No input data
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-gray-700 font-medium">Output</div>
                            {selectedStep.output && (
                              <CopyButton
                                text={typeof selectedStep.output === 'string' ? selectedStep.output : JSON.stringify(selectedStep.output, null, 2)}
                              />
                            )}
                          </div>
                          {selectedStep.output ? (
                            <JsonViewer data={selectedStep.output} className="max-h-96" />
                          ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-500">
                              No output data
                            </div>
                          )}
                        </div>
                        
                        {selectedStep.config && (
                          <div>
                            <div className="text-gray-700 font-medium mb-2">Configuration</div>
                            <JsonViewer data={selectedStep.config} className="max-h-24" />
                          </div>
                        )}
                        
                        {selectedStep.attempts && selectedStep.attempts.length > 0 && (
                          <div>
                            <div className="text-gray-700 font-medium mb-2">Attempts ({selectedStep.attempts.length})</div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {selectedStep.attempts.map((attempt: any, idx: number) => (
                                <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-2 text-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium">Attempt {idx + 1}</span>
                                    <Badge variant={attempt.success ? 'success' : 'error'}>
                                      {attempt.success ? 'Success' : 'Failed'}
                                    </Badge>
                                  </div>
                                  {attempt.error && (
                                    <div className="text-red-600 mt-1">
                                      {typeof attempt.error === 'object' 
                                        ? (attempt.error.message || attempt.error.name || 'Error')
                                        : String(attempt.error)}
                                    </div>
                                  )}
                                  <div className="text-gray-500 mt-1">
                                    {attempt.start ? new Date(attempt.start).toLocaleTimeString() : '—'} - {attempt.end ? new Date(attempt.end).toLocaleTimeString() : '—'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-gray-500">Duration</div>
                            <div className="font-medium">
                              {selectedStep.start && selectedStep.end 
                                ? `${Math.round((new Date(selectedStep.end).getTime() - new Date(selectedStep.start).getTime()))} ms`
                                : 'N/A'
                              }
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Total Attempts</div>
                            <div className="font-medium">{selectedStep.attempts?.length || 1}</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-xl font-bold text-gray-900">Step History</h2>
          </CardHeader>
          <CardContent>
            <DataTable
              data={instance?.steps || []}
              columns={stepColumns}
            />
          </CardContent>
        </Card>

        <div className="fixed bottom-6 right-6 z-40">
          <Button
            variant="primary"
            onClick={() => setIsLogsOpen(true)}
            className="rounded-full shadow-lg relative"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Workflow Tail
            {instance?.status && (instance.status.toLowerCase() === 'running' || instance.status.toLowerCase() === 'queued') && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </Button>
        </div>

        <WorkflowTailBottomSheet
          workflowName={workflowName}
          instanceId={instanceId}
          isOpen={isLogsOpen}
          onClose={() => setIsLogsOpen(false)}
          onStatusUpdate={() => {}}
        />
      </div>
    </div>
  );
}
