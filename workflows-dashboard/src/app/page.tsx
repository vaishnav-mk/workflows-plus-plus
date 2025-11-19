'use client';

import React, { useState, useCallback } from 'react';
import { addEdge, Connection, applyNodeChanges, applyEdgeChanges, EdgeChange } from 'reactflow';
import { X, CheckCircle } from 'lucide-react';
import Link from 'next/link';

import { CloudflareLayout } from './components/CloudflareLayout';
import { WorkflowToolbar } from './components/WorkflowToolbar';
import { CodePreview } from '../components/CodePreview';
import { WorkflowSidebar } from '../components/workflow/WorkflowSidebar';
import { WorkflowCanvas } from '../components/workflow/WorkflowCanvas';
import { WorkflowSettingsPanel } from '../components/workflow/WorkflowSettingsPanel';
import { WorkflowProvider } from '../contexts/WorkflowContext';
import { useWorkflowStore } from '../stores/workflowStore';
import { useApiStore } from '../stores/apiStore';
import { toast } from '../stores/toastStore';
import { BaseNode } from '../types/workflow';

interface WorkflowBuilderContentProps {
  isShowingTempFlow?: boolean;
  onAcceptTempFlow?: () => void;
  onRejectTempFlow?: () => void;
}

function WorkflowBuilderContent({ 
  isShowingTempFlow, 
  onAcceptTempFlow, 
  onRejectTempFlow 
}: WorkflowBuilderContentProps) {
  const {
    nodes,
    setNodes,
    edges,
    setEdges,
    selectedNode,
    setSelectedNode,
    selectedEdge,
    setSelectedEdge,
    registry,
    addNode,
    updateNode,
    insertNodeBetweenEdge,
    showCodePreview,
    setShowCodePreview,
    backendCode,
    setBackendCode,
    backendBindings,
    setBackendBindings,
    mcpEnabled,
    setMCPEnabled,
  } = useWorkflowStore();
  
  const { generateCode, deployWorkflow, loading } = useApiStore();
  const [isDeploying, setIsDeploying] = useState(false);

  const handleNodesChange = useCallback((changes: any) => {
    setNodes(applyNodeChanges(changes, nodes));
  }, [setNodes, nodes]);
  
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    const filtered = changes.filter(c => c.type !== 'remove');
    setEdges(applyEdgeChanges(filtered as any, edges));
  }, [setEdges, edges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges(addEdge(params, edges)),
    [setEdges, edges]
  );

  const handleCodePreviewClick = useCallback(async () => {
    try {
      const result = await generateCode(nodes, edges);
      if (result.data?.data?.workerTs) {
        setBackendCode(result.data.data.workerTs);
        setBackendBindings(result.data.data.bindings || []);
        toast.success(
          "Code Generated",
          "Worker code generated successfully"
        );
      } else {
        setBackendCode(undefined);
        setBackendBindings(undefined);
        toast.warning(
          "Code Generation Issue",
          "No worker code found in response"
        );
      }
    } catch (e) {
      setBackendCode(undefined);
      setBackendBindings(undefined);
      toast.error(
        "Code Generation Failed",
        e instanceof Error ? e.message : 'Unknown error'
      );
    }
    setShowCodePreview(true);
  }, [generateCode, nodes, edges, setBackendCode, setBackendBindings, setShowCodePreview]);

  const handleDeployClick = useCallback(async () => {
    setIsDeploying(true);
    
    try {
      const workflowName = nodes.length > 0 
        ? `workflow-${Date.now()}` 
        : 'my-workflow';
      
      const result = await deployWorkflow(
        nodes,
        edges,
        workflowName,
        undefined,
        backendBindings,
        undefined
      );
      
      if (result.data?.success) {
        const deploymentInfo = result.data.data;
        const actualWorkflowName = deploymentInfo.workflow?.workflowApiName || workflowName;
        const instanceId = deploymentInfo.deployment?.instanceId;
        
        toast.success(
          'Deployment Successful!',
          instanceId 
            ? `Redirecting to instance ${instanceId}...`
            : deploymentInfo.deployment?.url 
              ? `Worker URL: ${deploymentInfo.deployment.url}`
              : `Workflow: ${actualWorkflowName}`,
          6000
        );
        
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            if (instanceId) {
              window.location.href = `/workflows/${actualWorkflowName}/instances/${instanceId}`;
            } else {
              window.location.href = '/workflows';
            }
          }, 2000);
        }
      } else {
        toast.error(
          'Deployment Failed',
          result.error || 'Unknown error'
        );
      }
    } catch (e) {
      toast.error(
        'Deployment Failed',
        e instanceof Error ? e.message : 'Unknown error'
      );
    } finally {
      setIsDeploying(false);
    }
  }, [deployWorkflow, nodes, edges, backendBindings]);

  return (
    <CloudflareLayout>
            <div className="header-bar px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-white">
                    <Link href="/workflows" className="hover:text-blue-200">Workflows</Link> / 
                    <span className="font-semibold"> Builder</span>
                  </div>
                </div>
          <div className="flex items-center space-x-4">
            <WorkflowToolbar 
              onCodePreview={handleCodePreviewClick}
              onDeploy={handleDeployClick}
              isDeploying={isDeploying || loading}
              mcpEnabled={mcpEnabled}
              onMCPToggle={setMCPEnabled}
            />
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        {selectedEdge && (
          <WorkflowSidebar 
            onAddNode={(nodeType: string) => {
              if (selectedEdge) {
                insertNodeBetweenEdge((selectedEdge as any).id as string, nodeType);
                setSelectedEdge(null);
              }
            }}
            registry={registry || undefined}
            nodes={nodes}
            edges={edges}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNode(node)}
          onEdgeClick={(_, edge) => {
            setSelectedEdge(edge as any);
          }}
        />
          
          {isShowingTempFlow && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">AI Suggested Nodes</span>
                <div className="flex space-x-2">
                  <button
                    onClick={onRejectTempFlow}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors border-2 border-dashed border-red-300"
                  >
                    <X className="w-4 h-4" />
                    <span className="font-medium">Reject</span>
                  </button>
                  <button
                    onClick={onAcceptTempFlow}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors border-2 border-dashed border-green-300"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Accept</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <WorkflowSettingsPanel
          selectedNode={selectedNode}
          onNodeUpdate={updateNode}
          onClose={() => setSelectedNode(null)}
        />
      </div>

      <div className="footer-bar px-6 py-2">
        <div className="text-sm">
          /358a7dea729b5e8f8/ai/ai-gateway/gateways/orbis-ai/.../edit
        </div>
      </div>

      <CodePreview 
        workflow={{
          id: 'workflow-1',
          name: 'My Workflow',
          description: 'Generated workflow',
          version: '1.0.0',
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            author: 'User',
            tags: []
          },
          bindings: {
            kv: [],
            d1: [],
            r2: [],
            ai: { binding: 'AI' },
            secrets: []
          },
          nodes: nodes as BaseNode[],
          edges: edges,
          entryNodeId: nodes.find(n => n.type === 'entry')?.id || nodes[0]?.id || '',
          variables: {}
        }}
        isOpen={showCodePreview}
        onClose={() => setShowCodePreview(false)}
        code={backendCode}
        bindings={backendBindings}
      />
    </CloudflareLayout>
  );
}

export default function WorkflowBuilder() {
  const [isShowingTempFlow, setIsShowingTempFlow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { 
    initializeWorkflow, 
    loadWorkflowFromStorage, 
    applyWorkflowToState 
  } = useWorkflowStore();
  
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  React.useEffect(() => {
    if (mounted) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const workflowId = params.get('workflowId');
        
        if (workflowId) {
          const storedWorkflow = loadWorkflowFromStorage(workflowId);
          if (storedWorkflow) {
            applyWorkflowToState(storedWorkflow);
            return;
          }
        }
      }
      
      initializeWorkflow();
    }
  }, [mounted, initializeWorkflow, loadWorkflowFromStorage, applyWorkflowToState]);
  
  const handleBrainClick = useCallback((_nodeId: string, _description: string) => {
  }, []);

  const handleBrainAccept = useCallback((_nodeId: string, _suggestions: any[]) => {
    setIsShowingTempFlow(true);
  }, []);

  const handleAcceptTempFlow = useCallback(() => {
    setIsShowingTempFlow(false);
  }, []);

  const handleRejectTempFlow = useCallback(() => {
    setIsShowingTempFlow(false);
  }, []);
  
  if (!mounted) {
    return null;
  }

  return (
    <WorkflowProvider onBrainClick={handleBrainClick} onBrainAccept={handleBrainAccept} nodes={[]} edges={[]}>
      <WorkflowBuilderContent 
        isShowingTempFlow={isShowingTempFlow}
        onAcceptTempFlow={handleAcceptTempFlow}
        onRejectTempFlow={handleRejectTempFlow}
      />
    </WorkflowProvider>
  );
}