'use client';

import { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { CloudflareLayout } from './components/CloudflareLayout';
import { WorkflowNode } from './components/WorkflowNode';
import { NodePalette } from './components/NodePalette';
import { WorkflowToolbar } from './components/WorkflowToolbar';

const nodeTypes: NodeTypes = {
  workflow: WorkflowNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'workflow',
    position: { x: 250, y: 100 },
    data: { 
      label: 'HTTP Request',
      type: 'trigger',
      icon: '🌐',
      description: 'Incoming HTTP request'
    },
  },
  {
    id: '2',
    type: 'workflow',
    position: { x: 250, y: 250 },
    data: { 
      label: 'Worker',
      type: 'worker',
      icon: '⚡',
      description: 'Cloudflare Worker'
    },
  },
  {
    id: '3',
    type: 'workflow',
    position: { x: 250, y: 400 },
    data: { 
      label: 'D1 Database',
      type: 'database',
      icon: '🗄️',
      description: 'D1 Database query'
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true,
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    animated: true,
  },
];

export default function WorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const addNode = useCallback((nodeType: string, nodeData: any) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: 'workflow',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label: nodeData.label,
        type: nodeType,
        icon: nodeData.icon,
        description: nodeData.description,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  return (
    <CloudflareLayout>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-80 bg-gray-800 text-white flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Workflow Builder</h2>
            <p className="text-sm text-gray-400">Drag nodes to build your workflow</p>
          </div>
          
          <NodePalette onAddNode={addNode} />
          
          {selectedNode && (
            <div className="p-4 border-t border-gray-700">
              <h3 className="font-semibold mb-2">Node Properties</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Type:</span> {selectedNode.data.type}
                </div>
                <div>
                  <span className="text-gray-400">Label:</span> {selectedNode.data.label}
                </div>
                <div>
                  <span className="text-gray-400">Description:</span> {selectedNode.data.description}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Workflow Builder</h1>
                <p className="text-sm text-gray-600">Create and manage your Cloudflare workflows</p>
              </div>
              <WorkflowToolbar />
            </div>
          </div>

          {/* React Flow Canvas */}
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-gray-50"
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <Controls />
              <MiniMap 
                nodeColor={(node) => {
                  switch (node.data?.type) {
                    case 'trigger': return '#10b981';
                    case 'worker': return '#f59e0b';
                    case 'database': return '#3b82f6';
                    case 'storage': return '#8b5cf6';
                    default: return '#6b7280';
                  }
                }}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                }}
              />
            </ReactFlow>
          </div>
        </div>
      </div>
    </CloudflareLayout>
  );
}