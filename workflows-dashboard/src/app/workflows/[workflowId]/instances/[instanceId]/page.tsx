'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { CloudflareLayout } from '../../../../components/CloudflareLayout';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { EnhancedWorkflowNode } from '../../../../../components/workflow/EnhancedWorkflowNode';
import { useWorkflowStore } from '../../../../../stores/workflowStore';
import { WorkflowProvider } from '../../../../../contexts/WorkflowContext';
import { JsonViewer } from '../../../../../components/ui/JsonViewer';
import { WorkflowTailBottomSheet } from '../../../../../components/workflow/WorkflowTailBottomSheet';
import { InstanceLoader } from '../../../../../components/ui/Loader';

interface InstanceDetail {
  id?: string;
  status: string;
  start?: string;
  end?: string;
  success?: boolean;
  error?: string;
  output?: any;
  steps?: Array<{
    name: string;
    start: string;
    end: string;
    success: boolean;
    output?: any;
    error?: string;
    type?: string;
    finished?: boolean;
    config?: any;
    attempts?: Array<{
      start: string;
      end: string;
      success: boolean;
      error?: string;
    }>;
  }>;
}

export default function InstanceDetailPage() {
  const params = useParams();
  const workflowName = params.workflowId as string;
  const instanceId = params.instanceId as string;
  
  const [instance, setInstance] = useState<InstanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLogsOpen, setIsLogsOpen] = useState(true);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const storeNodes = useWorkflowStore(s => s.nodes);
  const storeEdges = useWorkflowStore(s => s.edges);
  const initializeWorkflow = useWorkflowStore(s => s.initializeWorkflow);

  const nodeTypes = useMemo(() => ({ workflow: EnhancedWorkflowNode }), []);

  useEffect(() => {
    if ((storeNodes?.length || 0) === 0) {
      initializeWorkflow();
    }
  }, [storeNodes, initializeWorkflow]);

  const normalizeStepName = (node: any) => {
    const label = (node?.data?.label || '').toLowerCase();
    const type = (node?.data?.type || '').toLowerCase();
    
    if (type === 'entry') return 'start-1';
    if (type === 'http-request') return 'httpRequest-1';
    if (type === 'kv-put') return 'kvPut-1';
    if (type === 'kv-get') return 'kvGet-1';
    if (type === 'transform') return 'transform-1';
    if (type === 'sleep') return 'sleep-1';
    if (type === 'return') return 'return-1';
    
    if (type && /entry|return/.test(type)) return `${type}-1`;
    if (type && !label.includes(type)) return `${type}-1`;
    return label;
  };

  const updateNodesWithStatus = useCallback((instanceData: InstanceDetail) => {
    const updatedNodes = (storeNodes || []).map(node => {
      const candidate1 = normalizeStepName(node);
      const candidate2 = node.data?.label;
      const step = (instanceData?.steps || []).find(s => s.name === candidate1 || s.name === candidate2);
      
      const description = step
        ? `Start: ${step.start ? new Date(step.start).toLocaleTimeString() : '—'} | End: ${step.end ? new Date(step.end).toLocaleTimeString() : '—'}`
        : (node.data?.description || 'Workflow node');

      // Determine status and color
      // Step status logic:
      // - If step.success === true → 'completed'
      // - If step.success === false → 'failed' (explicitly failed)
      // - If step.success === null:
      //   - Check if all retries are exhausted (attempts.length >= retry limit) and last attempt failed → 'failed'
      //   - If step.end === null → 'running' (still in progress)
      //   - If step.end !== null and last attempt failed → 'failed'
      // - If no step → use instance status
      const getStepStatus = () => {
        if (!step) return null;
        
        if (step.success === true) return 'completed';
        if (step.success === false) return 'failed';
        
        // Check if retries are exhausted
        const retryLimit = step.config?.retries?.limit || 0;
        const attempts = step.attempts || [];
        const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
        const allRetriesExhausted = attempts.length >= retryLimit && retryLimit > 0;
        
        // If all retries exhausted and last attempt failed, mark as failed
        if (allRetriesExhausted && lastAttempt && lastAttempt.success === false) {
          return 'failed';
        }
        
        // If step hasn't ended yet, it's still running
        if (step.end === null) {
          return 'running';
        }
        
        // Step ended but no explicit success status - check last attempt
        if (lastAttempt && lastAttempt.success === false) {
          return 'failed';
        }
        
        return 'pending';
      };
      
      const status = getStepStatus() || 
        (instanceData?.status?.toLowerCase() === 'complete' || instanceData?.success === true
          ? 'completed'
          : instanceData?.status?.toLowerCase() === 'running'
            ? 'running'
            : 'pending');
      
      const backgroundColor = status === 'completed'
        ? '#10b981' // green
        : status === 'failed'
          ? '#FECCC8' // custom red
          : status === 'running'
            ? '#3b82f6' // blue for running
            : '#fbbf24'; // yellow for pending

      return {
        ...node,
        style: {
          ...node.style,
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
    
    setNodes(updatedNodes);
    setEdges(storeEdges || []);
  }, [setNodes, setEdges, storeNodes, storeEdges]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const instanceUrl = `http://localhost:8787/api/workflows/${workflowName}/instances/${instanceId}`;
        const instanceResponse = await fetch(instanceUrl);
        const instanceData = await instanceResponse.json();
        
        if (!instanceData.success) {
          throw new Error(instanceData.error || 'Failed to fetch instance');
        }
        
        const instance = instanceData.data?.result || instanceData.data;
        setInstance(instance);
        
        if (instance) {
          updateNodesWithStatus(instance);
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (workflowName && instanceId) {
      fetchData();
    }
  }, [workflowName, instanceId, updateNodesWithStatus]);

  // Update nodes when store nodes become available
  useEffect(() => {
    if (instance && (storeNodes?.length || 0) > 0) {
      updateNodesWithStatus(instance);
    }
  }, [instance, storeNodes, updateNodesWithStatus]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'complete':
        return 'bg-[#A8E9C0] text-green-800';
      case 'failed':
      case 'error':
        return 'bg-[#FECCC8] text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <CloudflareLayout>
        <InstanceLoader text="Loading workflow instance..." />
      </CloudflareLayout>
    );
  }

  if (error) {
    return (
      <CloudflareLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </CloudflareLayout>
    );
  }

  return (
    <CloudflareLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="px-6 py-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <a href="/workflows" className="hover:text-gray-700">Back</a>
          </div>
          
          <div className="flex items-center space-x-3 mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Instance</h1>
            <span className="text-lg text-gray-600">{instanceId}</span>
          </div>
        </div>


        {/* Workflow Visualization */}
        <div className="px-6 pb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Workflow Execution</h2>
          <div className="bg-white border border-gray-200 rounded-lg h-full grid grid-cols-12 gap-4">
            <div className="col-span-7">
              <WorkflowProvider 
                onBrainClick={() => {}} 
                onBrainAccept={() => {}} 
                nodes={storeNodes || []} 
                edges={storeEdges || []}
              >
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  connectionMode={ConnectionMode.Loose}
                  fitView
                  nodeTypes={nodeTypes}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={true}
                  panOnDrag={false}
                  panOnScroll={false}
                  zoomOnScroll={false}
                  zoomOnPinch={false}
                  preventScrolling={true}
                  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                >
                  <Background />
                </ReactFlow>
              </WorkflowProvider>
            </div>
            <div className="col-span-5 border-l border-gray-200 p-4 overflow-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Node Details</h3>
              {(() => {
                const active = nodes.find(n => n.selected);
                const normalizedName = active ? normalizeStepName(active) : '';
                const step = active ? (instance?.steps || []).find(s => s.name === normalizedName || s.name === active.data?.label) : undefined;
                
                if (!active) return <div className="text-sm text-gray-500">Select a node to see details</div>;
                
                // Find input data (output from previous step)
                const getInputData = () => {
                  if (!instance?.output) return null;
                  
                  // For the first step (httpRequest), input is the initial payload
                  if (active.data?.type === 'http-request') {
                    return { message: 'Initial workflow payload', data: '{}' };
                  }
                  
                  // For other steps, find the previous step's output
                  const currentStepIndex = instance.steps?.findIndex(s => s.name === step?.name) || -1;
                  if (currentStepIndex > 0) {
                    const previousStep = instance.steps?.[currentStepIndex - 1];
                    return previousStep?.output;
                  }
                  
                  return null;
                };
                
                const inputData = getInputData();
                const outputData = step?.output;
                const copyToClipboard = (text: string) => {
                  navigator.clipboard.writeText(text);
                };
                
                return (
                  <div className="space-y-4 text-sm">
                    {/* Node Info */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900">{active.data?.label}</div>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(step?.success ? 'completed' : 'failed')}`}>
                          {step?.success ? 'Completed' : 'Failed'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {active.data?.type} • {step?.start ? new Date(step.start).toLocaleTimeString() : '—'} - {step?.end ? new Date(step.end).toLocaleTimeString() : '—'}
                      </div>
                    </div>
                    
                    {/* Input Data */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-gray-700 font-medium">Input</div>
                        {inputData && (
                          <button
                            onClick={() => copyToClipboard(typeof inputData === 'string' ? inputData : JSON.stringify(inputData, null, 2))}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                          </button>
                        )}
                      </div>
                      {inputData ? (
                        <JsonViewer data={inputData} className="max-h-96" />
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-500">
                          No input data
                        </div>
                      )}
                    </div>
                    
                    {/* Output Data */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-gray-700 font-medium">Output</div>
                        {outputData && (
                          <button
                            onClick={() => copyToClipboard(typeof outputData === 'string' ? outputData : JSON.stringify(outputData, null, 2))}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                          </button>
                        )}
                      </div>
                      {outputData ? (
                        <JsonViewer data={outputData} className="max-h-96" />
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-500">
                          No output data
                        </div>
                      )}
                    </div>
                    
                    {/* Step Configuration */}
                    {step?.config && (
                      <div>
                        <div className="text-gray-700 font-medium mb-2">Configuration</div>
                        <JsonViewer data={step.config} className="max-h-24" />
                      </div>
                    )}
                    
                    {/* Timing Info */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-500">Duration</div>
                        <div className="font-medium">
                          {step?.start && step?.end 
                            ? `${Math.round((new Date(step.end).getTime() - new Date(step.start).getTime()))} ms`
                            : 'N/A'
                          }
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Attempts</div>
                        <div className="font-medium">{step?.attempts?.length || 1}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FECCC8' }}></div>
              <span>Failed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>Pending</span>
            </div>
          </div>
        </div>

        {/* Floating Action Button for Workflow Tail */}
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsLogsOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg flex items-center space-x-2 transition-colors relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-medium">Workflow Tail</span>
            {/* Animated pulse dot to indicate live activity */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </button>
        </div>

        {/* Step History */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Step History</h2>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Step</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {instance?.steps?.map((step, index) => (
                  <tr key={step.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(step.success ? 'completed' : 'failed')}`}>
                        {step.success ? 'Completed' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {step.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {step.type || 'step'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {step.start ? new Date(step.start).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {step.end ? new Date(step.end).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {step.start && step.end 
                        ? `${Math.round((new Date(step.end).getTime() - new Date(step.start).getTime()))} ms`
                        : 'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {step.attempts?.length || 1}
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No steps found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workflow Tail Bottom Sheet */}
        <WorkflowTailBottomSheet
          workflowName={workflowName}
          instanceId={instanceId}
          isOpen={isLogsOpen}
          onClose={() => setIsLogsOpen(false)}
          onStatusUpdate={(status) => {
            if (status) {
              setInstance(prev => prev ? { ...prev, ...status } : status);
            }
          }}
        />

      </div>
    </CloudflareLayout>
  );
} 