'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { WorkflowNode } from './WorkflowNode';
import { ConditionalEdge } from './ConditionalEdge';
import type { WorkflowCanvasProps } from '@/types/components';

const nodeTypes = {
  workflow: WorkflowNode,
  default: WorkflowNode,
};

const edgeTypes = {
  conditional: ConditionalEdge,
};

export function WorkflowCanvas({ 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange, 
  onConnect, 
  onNodeClick,
  onEdgeClick
}: WorkflowCanvasProps) {
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    rfInstanceRef.current = instance;
    
    if (nodes.length > 0) {
      setTimeout(() => {
        try {
          instance.fitView({ padding: 0.2, duration: 400 });
        } catch (error) {
          console.error('[WorkflowCanvas] fitView error:', error);
        }
      }, 300);
    }
  }, [nodes.length]);

  useEffect(() => {
    if (!rfInstanceRef.current || nodes.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      if (rfInstanceRef.current) {
        try {
          rfInstanceRef.current.fitView({ padding: 0.2, duration: 400 });
        } catch (error) {
          console.error('[WorkflowCanvas] fitView error:', error);
        }
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [nodes.length, nodes]);

  const preparedNodes = React.useMemo(() => {
    if (nodes.length === 0) {
      return [];
    }
    
    return nodes.map((node) => {
      return {
        ...node,
        type: 'workflow',
        draggable: false,
        selectable: true,
      };
    });
  }, [nodes]);

  return (
    <div 
      className="flex-1 relative workflow-canvas" 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '600px',
        backgroundColor: '#fafafa'
      }}
    >
      <ReactFlow
        nodes={preparedNodes}
        edges={edges || []}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ 
          type: 'step', 
          animated: true
        }}
        connectionLineType="step"
        nodesDraggable={false}
        nodesConnectable={true}
        elementsSelectable={true}
        panOnDrag={true}
        minZoom={0.1}
        maxZoom={2}
        fitView
        fitViewOptions={{ 
          padding: 0.2, 
          duration: 400,
          maxZoom: 1.5
        }}
        onInit={handleInit}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="#d1d5db"
        />
        <Controls />
        <MiniMap />
      </ReactFlow>
      
      {preparedNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center bg-white/90 p-8 rounded-lg shadow-sm">
            <p className="text-lg font-medium text-gray-700 mb-2">No workflow loaded</p>
            <p className="text-sm text-gray-500">Click "Sample" to load a sample workflow</p>
          </div>
        </div>
      )}
    </div>
  );
}
