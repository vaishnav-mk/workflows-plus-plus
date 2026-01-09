'use client';

import React, { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  type ReactFlowInstance,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { WorkflowNode } from './WorkflowNode';
import { ConditionalEdge } from './ConditionalEdge';
import { DefaultEdgeWithButton } from './DefaultEdgeWithButton';
import type { WorkflowCanvasProps } from '@/types/components';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useNodesStore } from '@/stores/workflow/nodesStore';

const nodeTypes = {
  workflow: WorkflowNode,
  default: WorkflowNode,
};

const edgeTypes = {
  conditional: ConditionalEdge,
  default: DefaultEdgeWithButton,
  step: DefaultEdgeWithButton,
};

let globalDraggedNodeType: string | null = null;

export function WorkflowCanvas({ 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange, 
  onConnect, 
  onNodeClick,
  onEdgeClick,
  setSelectedNode
}: WorkflowCanvasProps) {
  React.useEffect(() => {
    console.log('[WorkflowCanvas] Edges updated:', edges?.map(e => ({ id: e.id, source: e.source, target: e.target })));
  }, [edges]);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const [previewNode, setPreviewNode] = useState<Node | null>(null);
  const [previewEdge, setPreviewEdge] = useState<Edge | null>(null);
  const [snapPoint, setSnapPoint] = useState<{ x: number; y: number } | null>(null);
  const [dragOverEdge, setDragOverEdge] = useState<Edge | null>(null);
  const [dragOverNode, setDragOverNode] = useState<Node | null>(null);
  const { addNode, insertNodeBetweenEdge, setNodes, setEdges } = useWorkflowStore();

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    rfInstanceRef.current = instance;
  }, []);

  const getEdgeAtPosition = useCallback((flowX: number, flowY: number, threshold = 150): Edge | null => {
    if (!edges || edges.length === 0) {
      console.log('[getEdgeAtPosition] No edges available');
      return null;
    }
    
    console.log('[getEdgeAtPosition] Checking', { flowX, flowY, edgesCount: edges.length, threshold });
    
    let closestEdge: Edge | null = null;
    let closestDist = Infinity;
    
    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      if (!sourceNode || !targetNode) {
        console.log('[getEdgeAtPosition] Missing nodes for edge', edge.id);
        continue;
      }
      
      const sx = sourceNode.position.x + (sourceNode.width || 200) / 2;
      const sy = sourceNode.position.y + (sourceNode.height || 100) / 2;
      const tx = targetNode.position.x + (targetNode.width || 200) / 2;
      const ty = targetNode.position.y + (targetNode.height || 100) / 2;
      
      const dx = tx - sx;
      const dy = ty - sy;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) continue;
      
      const isVertical = Math.abs(dx) < Math.abs(dy);
      const isHorizontal = Math.abs(dy) < Math.abs(dx);
      
      let t: number;
      if (isVertical && Math.abs(dy) > 10) {
        t = Math.max(0, Math.min(1, (flowY - sy) / dy));
      } else if (isHorizontal && Math.abs(dx) > 10) {
        t = Math.max(0, Math.min(1, (flowX - sx) / dx));
      } else {
        t = Math.max(0, Math.min(1, ((flowX - sx) * dx + (flowY - sy) * dy) / (length * length)));
      }
      
      const px = sx + t * dx;
      const py = sy + t * dy;
      
      let dist: number;
      if (isVertical) {
        const yInRange = flowY >= Math.min(sy, ty) - 50 && flowY <= Math.max(sy, ty) + 50;
        dist = yInRange ? Math.abs(flowX - px) : Infinity;
      } else if (isHorizontal) {
        const xInRange = flowX >= Math.min(sx, tx) - 50 && flowX <= Math.max(sx, tx) + 50;
        dist = xInRange ? Math.abs(flowY - py) : Infinity;
      } else {
        dist = Math.sqrt((flowX - px) ** 2 + (flowY - py) ** 2);
      }
      
      if (dist < threshold && dist < closestDist) {
        closestDist = dist;
        closestEdge = edge;
      }
    }
    
    console.log('[getEdgeAtPosition] Result', { closestEdge: closestEdge?.id, closestDist, flowX, flowY });
    return closestEdge;
  }, [nodes, edges]);

  const getNodeAtPosition = useCallback((flowX: number, flowY: number): Node | null => {
    console.log('[getNodeAtPosition] Checking position', { flowX, flowY, nodesCount: nodes.length });
    
    for (const node of nodes) {
      const nodeX = node.position.x;
      const nodeY = node.position.y;
      const nodeWidth = node.width || 200;
      const nodeHeight = node.height || 100;
      
      const isInside = flowX >= nodeX && flowX <= nodeX + nodeWidth &&
          flowY >= nodeY && flowY <= nodeY + nodeHeight;
      
      console.log('[getNodeAtPosition] Node', node.id, { nodeX, nodeY, nodeWidth, nodeHeight, isInside });
      
      if (isInside) {
        return node;
      }
    }
    
    console.log('[getNodeAtPosition] No node found');
    return null;
  }, [nodes]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!rfInstanceRef.current || !reactFlowWrapper.current) {
      console.log('[handleDragOver] Missing instance or wrapper');
      return;
    }
    
    let nodeType = globalDraggedNodeType || (window as any).__draggedNodeType;
    
    if (nodeType && !globalDraggedNodeType) {
      globalDraggedNodeType = nodeType;
    }
    
    if (!nodeType) {
      console.log('[handleDragOver] No node type');
      return;
    }
    
    console.log('[handleDragOver] Using node type:', nodeType);
    
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const relativeX = e.clientX - reactFlowBounds.left;
    const relativeY = e.clientY - reactFlowBounds.top;
    
    const position = rfInstanceRef.current.screenToFlowPosition({
      x: relativeX,
      y: relativeY,
    });
    
    console.log('[handleDragOver] Coordinates', { 
      clientX: e.clientX, 
      clientY: e.clientY,
      bounds: { left: reactFlowBounds.left, top: reactFlowBounds.top },
      relative: { x: relativeX, y: relativeY },
      flow: position,
      nodeType
    });
    
    const edge = getEdgeAtPosition(position.x, position.y);
    const node = getNodeAtPosition(position.x, position.y);
    
    console.log('[handleDragOver] Detection result', { edge: edge?.id, node: node?.id });
    
    setDragOverEdge(edge);
    setDragOverNode(node);
    
    if (edge) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      if (sourceNode && targetNode) {
        const sx = sourceNode.position.x + (sourceNode.width || 200) / 2;
        const sy = sourceNode.position.y + (sourceNode.height || 100) / 2;
        const tx = targetNode.position.x + (targetNode.width || 200) / 2;
        const ty = targetNode.position.y + (targetNode.height || 100) / 2;
        
        const dx = tx - sx;
        const dy = ty - sy;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        const isVertical = Math.abs(dx) < Math.abs(dy);
        const isHorizontal = Math.abs(dy) < Math.abs(dx);
        
        let t: number;
        if (isVertical) {
          t = Math.max(0, Math.min(1, (position.y - sy) / dy));
        } else if (isHorizontal) {
          t = Math.max(0, Math.min(1, (position.x - sx) / dx));
        } else {
          t = Math.max(0, Math.min(1, ((position.x - sx) * dx + (position.y - sy) * dy) / (length * length)));
        }
        
        const px = sx + t * dx;
        const py = sy + t * dy;
        
        console.log('[handleDragOver] Edge snap calculation', { 
          source: { x: sx, y: sy }, 
          target: { x: tx, y: ty },
          isVertical,
          isHorizontal,
          t,
          snapPoint: { x: px, y: py }
        });
        
        setSnapPoint({ x: px, y: py });
        setPreviewNode({
          id: 'preview-node',
          type: 'default',
          position: { x: px - 100, y: py - 50 },
          data: { type: nodeType, label: '' },
          width: 200,
          height: 100,
        });
        setPreviewEdge(null);
      }
    } else if (node) {
      console.log('[handleDragOver] Node preview below', node.id);
      const nodeY = node.position.y + (node.height || 100);
      const nodeX = node.position.x + (node.width || 200) / 2;
      
      setSnapPoint(null);
      setPreviewNode({
        id: 'preview-node',
        type: 'default',
        position: { x: nodeX - 100, y: nodeY + 50 },
        data: { type: nodeType, label: '' },
        width: 200,
        height: 100,
      });
      setPreviewEdge({
        id: 'preview-edge',
        source: node.id,
        target: 'preview-node',
        type: 'step',
      });
    } else {
      console.log('[handleDragOver] Clearing preview');
      setSnapPoint(null);
      setPreviewNode(null);
      setPreviewEdge(null);
    }
  }, [nodes, getEdgeAtPosition, getNodeAtPosition]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    
    const nodeType = e.dataTransfer.getData('application/reactflow');
    console.log('[handleDrop] Drop event', { nodeType, dragOverEdge: dragOverEdge?.id, dragOverNode: dragOverNode?.id });
    
    if (!nodeType || !rfInstanceRef.current || !reactFlowWrapper.current) {
      console.log('[handleDrop] Missing requirements', { nodeType: !!nodeType, instance: !!rfInstanceRef.current, wrapper: !!reactFlowWrapper.current });
      return;
    }
    
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const relativeX = e.clientX - reactFlowBounds.left;
    const relativeY = e.clientY - reactFlowBounds.top;
    
    const position = rfInstanceRef.current.screenToFlowPosition({
      x: relativeX,
      y: relativeY,
    });
    
    console.log('[handleDrop] Drop position', { 
      clientX: e.clientX, 
      clientY: e.clientY,
      relative: { x: relativeX, y: relativeY },
      flow: position 
    });
    
    if (dragOverEdge) {
      console.log('[handleDrop] Inserting between edge', dragOverEdge.id);
      await insertNodeBetweenEdge(dragOverEdge.id, nodeType);
      setTimeout(async () => {
        const { nodes: updatedNodes } = useNodesStore.getState();
        const newNode = updatedNodes.find(n => !nodes.find(on => on.id === n.id));
        console.log('[handleDrop] New node after edge insert', newNode?.id, newNode?.position);
        if (newNode && setSelectedNode) {
          setSelectedNode(newNode);
        }
      }, 50);
    } else if (dragOverNode) {
      console.log('[handleDrop] Adding below node', dragOverNode.id);
      const nodeY = dragOverNode.position.y + (dragOverNode.height || 100);
      const nodeX = dragOverNode.position.x + (dragOverNode.width || 200) / 2;
      const newPosition = { x: nodeX - 100, y: nodeY + 50 };
      console.log('[handleDrop] New position below node', newPosition);
      
      await addNode(nodeType);
      const { nodes: updatedNodes, edges: currentEdges } = useNodesStore.getState();
      const newNode = updatedNodes[updatedNodes.length - 1];
      console.log('[handleDrop] Created node', newNode?.id, 'at', newNode?.position);
      
      if (newNode) {
        setNodes(updatedNodes.map(n => 
          n.id === newNode.id ? { ...n, position: newPosition } : n
        ));
        setEdges([...currentEdges, {
          id: `${dragOverNode.id}-${newNode.id}`,
          source: dragOverNode.id,
          target: newNode.id,
          type: 'step',
          animated: true,
        }]);
        console.log('[handleDrop] Updated node position and added edge');
      }
    } else {
      console.log('[handleDrop] Adding at free position', position);
      const beforeNodeIds = new Set(nodes.map(n => n.id));
      
      const { createNodeFromBackend } = await import('@/stores/workflow/nodeBuilder');
      const newNode = await createNodeFromBackend(nodeType, position);
      console.log('[handleDrop] Created node with position', newNode.id, newNode.position);
      
      const { addNode: addNodeToStore, nodes: currentNodes } = useNodesStore.getState();
      addNodeToStore(newNode);
      
      setTimeout(() => {
        const { nodes: updatedNodes } = useNodesStore.getState();
        const layoutedNode = updatedNodes.find(n => n.id === newNode.id);
        console.log('[handleDrop] After layout, node position', layoutedNode?.position);
        
        if (layoutedNode && (layoutedNode.position.x !== position.x || layoutedNode.position.y !== position.y)) {
          console.log('[handleDrop] Layout changed position, restoring to', position);
          useNodesStore.setState((state) => {
            const restored = state.nodes.map(n => 
              n.id === newNode.id ? { ...n, position } : n
            );
            return { nodes: restored };
          });
          
          setTimeout(() => {
            const { nodes: finalNodes } = useNodesStore.getState();
            const finalNode = finalNodes.find(n => n.id === newNode.id);
            console.log('[handleDrop] Final restored position', finalNode?.position);
          }, 50);
        }
      }, 150);
    }
    
    setPreviewNode(null);
    setPreviewEdge(null);
    setSnapPoint(null);
    setDragOverEdge(null);
    setDragOverNode(null);
    globalDraggedNodeType = null;
  }, [dragOverEdge, dragOverNode, addNode, insertNodeBetweenEdge, setNodes, setEdges, nodes, setSelectedNode]);

  const handleDragLeave = useCallback(() => {
    setPreviewNode(null);
    setPreviewEdge(null);
    setSnapPoint(null);
    setDragOverEdge(null);
    setDragOverNode(null);
  }, []);

  const preparedNodes = React.useMemo(() => {
    const result = nodes.map((node) => ({
      ...node,
      type: 'workflow',
      draggable: false,
      selectable: true,
    }));
    if (previewNode && !nodes.find(n => n.id === previewNode.id)) {
      result.push({
        ...previewNode,
        id: 'preview-node',
        type: 'workflow',
        opacity: 0.5,
        selectable: false,
        draggable: false,
      });
    }
    return result;
  }, [nodes, previewNode]);

  const preparedEdges = React.useMemo(() => {
    const result = [...(edges || [])];
    if (previewEdge) {
      result.push({
        ...previewEdge,
        style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5', opacity: 0.5 },
        animated: false,
      });
    }
    return result;
  }, [edges, previewEdge]);

  return (
    <div 
      ref={reactFlowWrapper}
      className="flex-1 relative workflow-canvas" 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '600px',
        backgroundColor: '#fafafa'
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      onDragEnter={(e) => {
        e.preventDefault();
        const types = e.dataTransfer.types;
        console.log('[onDragEnter] DataTransfer types:', types);
        if (types.includes('application/reactflow')) {
          console.log('[onDragEnter] ReactFlow data type detected');
        }
      }}
    >
      <ReactFlow
        nodes={preparedNodes}
        edges={preparedEdges}
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
        panOnDrag={[1, 2]}
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
      
      {snapPoint && rfInstanceRef.current && (() => {
        try {
          const screenPos = rfInstanceRef.current.flowToScreenPosition(snapPoint);
          return (
            <div
              className="absolute pointer-events-none z-50"
              style={{
                left: `${screenPos.x}px`,
                top: `${screenPos.y}px`,
                transform: 'translate(-50%, -50%)',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                border: '2px solid white',
                boxShadow: '0 0 0 2px #3b82f6',
              }}
            />
          );
        } catch {
          return null;
        }
      })()}
      
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
