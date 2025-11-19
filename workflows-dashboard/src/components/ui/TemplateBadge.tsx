'use client';

import React from 'react';
import { X, Type, Hash, ToggleLeft, Folder, List, FileJson } from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useNodeRegistry } from '../../hooks/useNodeRegistry';

interface TemplateBadgeProps {
  expression: string;
  onRemove: () => void;
  onClick?: () => void;
}

export function TemplateBadge({ expression, onRemove, onClick }: TemplateBadgeProps) {
  const { nodes } = useWorkflowStore();
  const { getNodeByType } = useNodeRegistry();
  
  // Extract the readable part (remove {{ and }})
  let readable = expression.replace(/\{\{|\}\}/g, '');
  const originalPath = readable;
  
  // Resolve node IDs to node names
  // Handle both state.nodeId.path and nodeId.path formats
  const resolveNodeName = (path: string): string => {
    // Check if it starts with "state."
    const isStateFormat = path.startsWith('state.');
    const pathWithoutState = isStateFormat ? path.substring(6) : path;
    
    // Split by dots to get parts
    const parts = pathWithoutState.split('.');
    if (parts.length === 0) return path;
    
    // First part is the node ID (could be a node ID like "node-1763152904779-v5ommzu2w")
    const nodeId = parts[0];
    const node = nodes.find(n => n.id === nodeId);
    
    if (node) {
      const nodeName = node.data?.label || node.type || nodeId;
      // Replace node ID with node name in the path
      const restOfPath = parts.slice(1).join('.');
      const resolvedPath = isStateFormat 
        ? `state.${nodeName}${restOfPath ? '.' + restOfPath : ''}`
        : `${nodeName}${restOfPath ? '.' + restOfPath : ''}`;
      return resolvedPath;
    }
    
    // If node not found, return original path
    return path;
  };
  
  const resolvedPath = resolveNodeName(readable);
  
  // Extract variable name (last part of path)
  // Handle both state.nodeId.output.body and nodeId.output.body formats
  const isStateFormat = originalPath.startsWith('state.');
  const pathWithoutState = isStateFormat ? originalPath.substring(6) : originalPath;
  const pathParts = pathWithoutState.split('.');
  const varName = pathParts[pathParts.length - 1] || 'output';
  
  // Determine type based on path and node definition
  const getTypeIcon = (): React.ReactNode => {
    // Try to find the node and its output port
    const pathWithoutStateForType = isStateFormat ? originalPath.substring(6) : originalPath;
    const parts = pathWithoutStateForType.split('.');
    
    if (parts.length >= 2) {
      const nodeId = parts[0];
      const node = nodes.find(n => n.id === nodeId);
      
      if (node) {
        const nodeDef = getNodeByType(node.data?.type || '');
        if (nodeDef) {
          // Check if this matches an output port
          const outputPort = nodeDef.outputPorts?.find(p => p.id === varName);
          if (outputPort) {
            const portType = outputPort.type.toLowerCase();
            if (portType === 'string' || portType === 'text') {
              return <Type className="w-3 h-3 text-blue-600" />;
            } else if (portType === 'number' || portType === 'integer') {
              return <Hash className="w-3 h-3 text-green-600" />;
            } else if (portType === 'boolean') {
              return <ToggleLeft className="w-3 h-3 text-purple-600" />;
            } else if (portType === 'object') {
              return <Folder className="w-3 h-3 text-orange-600" />;
            } else if (portType === 'array') {
              return <List className="w-3 h-3 text-pink-600" />;
            }
          }
          
          // Check preset output for type hints
          const presetOutput = (nodeDef as any)?.presetOutput;
          if (presetOutput && presetOutput[varName] !== undefined) {
            const value = presetOutput[varName];
            if (typeof value === 'string') {
              return <Type className="w-3 h-3 text-blue-600" />;
            } else if (typeof value === 'number') {
              return <Hash className="w-3 h-3 text-green-600" />;
            } else if (typeof value === 'boolean') {
              return <ToggleLeft className="w-3 h-3 text-purple-600" />;
            } else if (Array.isArray(value)) {
              return <List className="w-3 h-3 text-pink-600" />;
            } else if (typeof value === 'object') {
              return <Folder className="w-3 h-3 text-orange-600" />;
            }
          }
        }
      }
    }
    
    // Default to any/unknown type
    return <FileJson className="w-3 h-3 text-gray-600" />;
  };
  
  return (
    <span
      className="inline-flex flex-col items-start gap-0.5 px-2 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs cursor-pointer hover:bg-blue-200 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
    >
      <div className="flex items-center gap-1.5 w-full">
        {getTypeIcon()}
        <span className="font-medium">{varName}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-auto hover:bg-blue-300 rounded p-0.5 transition-colors"
          aria-label="Remove template"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <span className="font-mono text-[10px] text-blue-700 opacity-75">{`{{${resolvedPath}}}`}</span>
    </span>
  );
}

