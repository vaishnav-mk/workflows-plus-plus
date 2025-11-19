'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  BackgroundVariant,
  ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import { EnhancedWorkflowNode } from './EnhancedWorkflowNode';
import { EnhancedWorkflowEdge } from './EnhancedWorkflowEdge';
import { useNodeRegistry } from '../../hooks/useNodeRegistry';

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (params: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
}

const nodeTypes: NodeTypes = {
  workflow: EnhancedWorkflowNode
};

const edgeTypes = {
  default: EnhancedWorkflowEdge
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
  const hasCenteredRef = useRef(false);
  const { getNodeByType } = useNodeRegistry();

  // Centralized function to center and fit the workflow
  const centerWorkflow = useCallback((instance: ReactFlowInstance, nodes: Node[]) => {
    if (!instance || nodes.length === 0) return;

    try {
      // Calculate bounds manually from nodes
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      nodes.forEach((node) => {
        const nodeWidth = node.width || 200;
        const nodeHeight = node.height || 100;
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + nodeWidth);
        maxY = Math.max(maxY, node.position.y + nodeHeight);
      });

      const bounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };

      // Get canvas container dimensions
      const canvasElement = document.querySelector('.workflow-canvas') as HTMLElement;
      if (!canvasElement) {
        // Fallback to fitView
        instance.fitView({ 
          padding: 0.5, 
          duration: 800,
          includeHiddenNodes: false,
          minZoom: 0.3,
          maxZoom: 0.8
        });
        return;
      }

      const containerWidth = canvasElement.clientWidth;
      const containerHeight = canvasElement.clientHeight;

      // Calculate center of nodes
      const nodesCenterX = bounds.x + bounds.width / 2;
      const nodesCenterY = bounds.y + bounds.height / 2;

      // Calculate zoom with padding (200px on each side)
      const padding = 200;
      const availableWidth = containerWidth - padding * 2;
      const availableHeight = containerHeight - padding * 2;
      
      const zoomX = availableWidth / bounds.width;
      const zoomY = availableHeight / bounds.height;
      const desiredZoom = Math.min(zoomX, zoomY, 1.0);
      const finalZoom = Math.max(0.3, Math.min(desiredZoom, 0.8));

      // Center the view on the nodes
      instance.setCenter(nodesCenterX, nodesCenterY, { 
        duration: 800, 
        zoom: finalZoom 
      });
    } catch (error) {
      // Fallback to fitView if centering fails
      try {
        instance.fitView({ 
          padding: 0.5, 
          duration: 800,
          includeHiddenNodes: false,
          minZoom: 0.3,
          maxZoom: 0.8
        });
      } catch (fitError) {
        // Silently fail if both methods fail
      }
    }
  }, []);

  // Center workflow when nodes change - auto-expand to show all nodes
  useEffect(() => {
    if (!rfInstanceRef.current || nodes.length === 0) return;

    const timeoutId = setTimeout(() => {
      if (rfInstanceRef.current) {
        // Use fitView to ensure all nodes are visible
        try {
          rfInstanceRef.current.fitView({
            padding: 0.2,
            duration: 600,
            includeHiddenNodes: false,
            minZoom: 0.1,
            maxZoom: 1.5
          });
        } catch (error) {
          // Fallback to centerWorkflow if fitView fails
          centerWorkflow(rfInstanceRef.current, nodes);
        }
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [nodes.length, centerWorkflow]);

  // Handle auto-fit event - triggered when nodes are added
  useEffect(() => {
    const handleAutoFit = () => {
      if (rfInstanceRef.current && nodes.length > 0) {
        setTimeout(() => {
          if (rfInstanceRef.current) {
            // Use fitView to ensure all nodes are visible
            try {
              rfInstanceRef.current.fitView({
                padding: 0.2,
                duration: 600,
                includeHiddenNodes: false,
                minZoom: 0.1,
                maxZoom: 1.5
              });
            } catch (error) {
              // Fallback to centerWorkflow if fitView fails
              centerWorkflow(rfInstanceRef.current, nodes);
            }
          }
        }, 150);
      }
    };

    const canvas = document.querySelector('.workflow-canvas');
    if (canvas) {
      canvas.addEventListener('workflow-auto-fit', handleAutoFit);
      return () => canvas.removeEventListener('workflow-auto-fit', handleAutoFit);
    }
  }, [nodes, centerWorkflow]);

  // Initialize and center on mount
  const handleInit = useCallback((instance: ReactFlowInstance) => {
    rfInstanceRef.current = instance;
    
    // Center workflow on initialization if nodes exist
    if (nodes.length > 0 && !hasCenteredRef.current) {
      // Wait for ReactFlow to fully initialize
      setTimeout(() => {
        if (rfInstanceRef.current) {
          centerWorkflow(rfInstanceRef.current, nodes);
          hasCenteredRef.current = true;
        }
      }, 500);
    }
  }, [nodes, centerWorkflow]);

  // Reset centering flag when nodes change significantly
  useEffect(() => {
    hasCenteredRef.current = false;
  }, [nodes.length]);

  return (
    <div className="flex-1 relative workflow-canvas overflow-hidden min-h-[600px]">
      <ReactFlow
        nodes={nodes || []}
        edges={edges || []}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        defaultEdgeOptions={{ type: 'straight', animated: true }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.1}
        maxZoom={2}
        className="workflow-canvas"
        onInit={handleInit}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--grid-dots)" />
        <Controls className="bg-white border border-gray-200 shadow-sm" />
        <MiniMap 
          nodeColor={(node) => {
            const nodeType = node.data?.type;
            if (nodeType) {
              const nodeDef = getNodeByType(nodeType);
              return nodeDef?.metadata?.color || '#6b7280';
            }
            return '#6b7280';
          }}
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
          }}
        />
      </ReactFlow>
    </div>
  );
}
