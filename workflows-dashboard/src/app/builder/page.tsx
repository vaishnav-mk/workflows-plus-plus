'use client';

import React, { useState, useCallback } from 'react';
import { PageHeader } from '@/components';
import { WorkflowToolbar } from '@/components/WorkflowToolbar';
import { CodePreview } from '@/components/CodePreview';
import type { Binding } from '@/types/components';
import { WorkflowSidebar } from '@/components/workflow/WorkflowSidebar';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { WorkflowSettingsPanel } from '@/components/workflow/WorkflowSettingsPanel';
import { useWorkflowStore } from '@/stores/workflowStore';
import { toast } from '@/stores/toastStore';
import { BaseNode } from '@/types/workflow';
import { useCompileWorkflowMutation, useDeployWorkflowMutation } from '@/hooks/useWorkflowsQuery';
import { generateWorkflowId } from '@/utils/id-generator';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { Node } from 'reactflow';

function WorkflowBuilderContent() {
  const {
    nodes,
    edges,
    selectedNode,
    setSelectedNode,
    selectedEdge,
    setSelectedEdge,
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
    handleNodesChange,
    handleEdgesChange,
    handleConnect,
    saveWorkflowToStorage,
    setNodes,
  } = useWorkflowStore();
  
  const [isDeploying, setIsDeploying] = useState(false);
  const compileWorkflowMutation = useCompileWorkflowMutation();
  const deployWorkflowMutation = useDeployWorkflowMutation();
  const router = useRouter();
  
  // Get workflow ID from URL or generate one
  const [workflowId, setWorkflowId] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      const regen = params.get('regen');

      if (id && regen === '1') {
        // We loaded the existing workflow by this id already; now generate a fresh ID
        const newId = generateWorkflowId();
        setWorkflowId(newId);
        const newParams = new URLSearchParams(window.location.search);
        newParams.set('id', newId);
        newParams.delete('regen');
        window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`);
      } else if (id) {
        setWorkflowId(id);
      } else {
        // Generate new workflow ID and update URL
        const newId = generateWorkflowId();
        setWorkflowId(newId);
        const newParams = new URLSearchParams(window.location.search);
        newParams.set('id', newId);
        window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`);
      }
    }
  }, []);

  const handleCodePreviewClick = useCallback(async () => {
    try {
      // Use workflow ID from state or generate new one
      const currentWorkflowId = workflowId || generateWorkflowId();
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
        options: {
          workflowId: currentWorkflowId,
        },
      };
      
      const result = await compileWorkflowMutation.mutateAsync(workflow);
      if (result) {
        setBackendCode(result.tsCode);
        setBackendBindings(result.bindings || []);
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
  }, [nodes, edges, workflowId, setBackendCode, setBackendBindings, setShowCodePreview, compileWorkflowMutation]);

  const handleDeployClick = useCallback(async () => {
    setIsDeploying(true);
    
    try {
      // Use workflow ID from state or generate new one
      const currentWorkflowId = workflowId || generateWorkflowId();
      
      // Compile workflow first to get code and bindings
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
        options: {
          workflowId: currentWorkflowId,
        },
      };
      
      const compileResult = await compileWorkflowMutation.mutateAsync(workflow);
      
      if (!compileResult) {
        toast.error('Deployment Failed', 'Failed to compile workflow');
        return;
      }
      
      // Save workflow to storage
      saveWorkflowToStorage({
        id: currentWorkflowId,
        nodes,
        edges,
        backendCode: compileResult.tsCode,
        backendBindings: compileResult.bindings,
      });
      
      // Deploy workflow
      const deployResult = await deployWorkflowMutation.mutateAsync({
        workflowId: currentWorkflowId,
        options: {
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
          bindings: compileResult.bindings,
        },
      });
      
      // Get deployment ID from result
      const deploymentId = deployResult?.deploymentId || 
        (currentWorkflowId.startsWith("workflow-") 
          ? currentWorkflowId.replace("workflow-", "deployment-")
          : `deployment-${currentWorkflowId}`);
      
      // Redirect to deployment page
      router.push(`/deployment?id=${deploymentId}`);
    } catch (e) {
      toast.error(
        'Deployment Failed',
        e instanceof Error ? e.message : 'Unknown error'
      );
      setIsDeploying(false);
    }
  }, [nodes, edges, workflowId, compileWorkflowMutation, deployWorkflowMutation, router]);

  const handleMCPToggle = useCallback(async (enabled: boolean) => {
    setMCPEnabled(enabled);
    
    const updatedNodes = await Promise.all(nodes.map(async (node) => {
      const nodeType = node.data?.type;
      
      if (enabled) {
        if (nodeType === 'entry') {
          const def = await apiClient.getNodeDefinition('mcp-tool-input');
          if (def.success && def.data) {
            return {
              ...node,
              data: {
                ...node.data,
                type: 'mcp-tool-input',
                label: def.data.metadata.name,
                icon: def.data.metadata.icon,
              }
            };
          }
        } else if (nodeType === 'return') {
          const def = await apiClient.getNodeDefinition('mcp-tool-output');
          if (def.success && def.data) {
            return {
              ...node,
              data: {
                ...node.data,
                type: 'mcp-tool-output',
                label: def.data.metadata.name,
                icon: def.data.metadata.icon,
              }
            };
          }
        }
      } else {
        if (nodeType === 'mcp-tool-input') {
          const def = await apiClient.getNodeDefinition('entry');
          if (def.success && def.data) {
            return {
              ...node,
              data: {
                ...node.data,
                type: 'entry',
                label: def.data.metadata.name,
                icon: def.data.metadata.icon,
              }
            };
          }
        } else if (nodeType === 'mcp-tool-output') {
          const def = await apiClient.getNodeDefinition('return');
          if (def.success && def.data) {
            return {
              ...node,
              data: {
                ...node.data,
                type: 'return',
                label: def.data.metadata.name,
                icon: def.data.metadata.icon,
              }
            };
          }
        }
      }
      
      return node;
    }));
    
    setNodes(updatedNodes);
  }, [nodes, setMCPEnabled, setNodes]);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="w-full flex items-center justify-between">
          <PageHeader
            title="Workflow Builder"
            description="Build and deploy workflows with drag and drop"
          />
          <WorkflowToolbar 
            onCodePreview={handleCodePreviewClick}
            onDeploy={handleDeployClick}
            isDeploying={isDeploying || compileWorkflowMutation.isPending}
            mcpEnabled={mcpEnabled}
            onMCPToggle={handleMCPToggle}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
        <WorkflowSidebar 
          onAddNode={(nodeType: string) => {
            if (selectedEdge) {
              insertNodeBetweenEdge((selectedEdge as any).id as string, nodeType);
              setSelectedEdge(null);
            }
          }}
          nodes={nodes}
          edges={edges}
          edgeSelected={!!selectedEdge}
        />

        <div className="flex-1 flex flex-col overflow-hidden" style={{ height: '100%', width: '100%' }}>
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onEdgeClick={(_, edge) => {
              setSelectedEdge(edge as any);
            }}
          />
        </div>

        <WorkflowSettingsPanel
          selectedNode={selectedNode}
          onNodeUpdate={updateNode}
          onClose={() => setSelectedNode(null)}
        />
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
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type || 'default',
            position: node.position,
            data: (node.data as any) || { config: {}, inputs: [], outputs: [], validation: { isValid: true, errors: [], warnings: [] } },
            metadata: (node as any).metadata || { label: node.type || 'Node', description: '', icon: 'Circle', category: 'control' as const, version: '1.0.0' }
          })) as BaseNode[],
          edges: edges,
          entryNodeId: nodes.find(n => n.type === 'entry')?.id || nodes[0]?.id || '',
          variables: {}
        }}
        isOpen={showCodePreview}
        onClose={() => setShowCodePreview(false)}
        code={backendCode || ''}
        bindings={Array.isArray(backendBindings) ? backendBindings.filter((b): b is Binding => 
          typeof b === 'object' && b !== null && 'type' in b && typeof (b as Binding).type === 'string' && 'name' in b && typeof (b as Binding).name === 'string'
        ) : []}
        nodes={nodes}
        onNodeSelect={(nodeId) => {
          const node = nodes.find(n => n.id === nodeId);
          if (node) {
            setSelectedNode(node);
          }
        }}
      />
    </div>
  );
}

export default function WorkflowBuilder() {
  const [mounted, setMounted] = useState(false);
  const { 
    initializeWorkflow, 
    loadWorkflowFromStorage, 
    applyWorkflowToState,
    saveWorkflowToStorage
  } = useWorkflowStore();
  
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  const initializedRef = React.useRef(false);
  
  React.useEffect(() => {
    if (!mounted || initializedRef.current) return;
    
    const init = async () => {
      initializedRef.current = true;
      
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const type = params.get('type');
        const id = params.get('id');
        const templateType = params.get('template_type');
        
        // Handle starter workflow
        // Format: ?type=starter&template_type=ai-processing&id=workflow-ghost-beneficiary-bed
        if (type === 'starter') {
          try {
            const { apiClient } = await import('@/lib/api-client');
            
            // Use template_type to get the starter, or fallback to id if template_type not provided
            const starterId = templateType || id;
            if (!starterId) {
              console.error('[WorkflowBuilder] Missing starter ID (template_type or id)');
              await initializeWorkflow();
              return;
            }
            
            const result = await apiClient.getWorkflowStarter(starterId);
            
            if (result.success && result.data) {
              const starter = result.data;
              // Use provided workflow ID or generate new one
              const workflowId = id || generateWorkflowId();
              
              // Update URL with proper parameters
              const newParams = new URLSearchParams();
              newParams.set('type', 'starter');
              if (templateType) {
                newParams.set('template_type', templateType);
              } else if (starterId) {
                newParams.set('template_type', starterId);
              }
              newParams.set('id', workflowId);
              window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`);
              
              await applyWorkflowToState({
                nodes: starter.workflow.nodes,
                edges: starter.workflow.edges
              });
              
              // Save starter workflow to storage
              saveWorkflowToStorage({
                id: workflowId,
                nodes: starter.workflow.nodes,
                edges: starter.workflow.edges,
              });
              return;
            }
          } catch (error) {
            console.error('[WorkflowBuilder] Failed to load starter:', error);
          }
        }
        
        // Handle AI-generated workflow
        if (type === 'ai' && id) {
          const storedWorkflow = loadWorkflowFromStorage(id);
          if (storedWorkflow) {
            await applyWorkflowToState(storedWorkflow);
            return;
          }
        }
        
        // Handle workflow from storage (by ID)
        if (id && !type) {
          const storedWorkflow = loadWorkflowFromStorage(id);
          if (storedWorkflow) {
            await applyWorkflowToState(storedWorkflow);
            return;
          }
        }
        
        // Handle workflow from version (reverse codegen)
        if (type === 'version') {
          try {
            const storedWorkflowStr = sessionStorage.getItem('workflow-from-version');
            if (storedWorkflowStr) {
              const storedWorkflow = JSON.parse(storedWorkflowStr);
              await applyWorkflowToState(storedWorkflow);
              // Clear the stored workflow after loading
              sessionStorage.removeItem('workflow-from-version');
              return;
            }
          } catch (error) {
            console.error('[WorkflowBuilder] Failed to load workflow from version:', error);
            toast.error('Failed to Load Workflow', 'Could not parse workflow from version.');
          }
        }
      }
      
      // Default: Initialize empty workflow
      await initializeWorkflow();
    };
    
    init();
  }, [mounted]); // Only depend on mounted, not the functions
  
  if (!mounted) {
    return null;
  }

  return <WorkflowBuilderContent />;
}
