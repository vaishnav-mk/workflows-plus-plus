'use client';

import React from 'react';
import { X, Type, Hash, ToggleLeft, Folder, List, FileJson } from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflowStore';

interface TemplateBadgeProps {
  expression: string;
  onRemove: () => void;
  onClick?: () => void;
}

export function TemplateBadge({ expression, onRemove, onClick }: TemplateBadgeProps) {
  const { nodes } = useWorkflowStore();
  
  const readable = expression.replace(/\{\{|\}\}/g, '');
  const originalPath = readable;
  
  const resolveNodeName = (path: string): string => {
    const isStateFormat = path.startsWith('state.');
    const pathWithoutState = isStateFormat ? path.substring(6) : path;
    
    const parts = pathWithoutState.split('.');
    if (parts.length === 0) return path;
    
    const nodeId = parts[0];
    const node = nodes.find(n => n.id === nodeId);
    
    if (node) {
      const nodeName = node.data?.label || node.type || nodeId;
      const restOfPath = parts.slice(1).join('.');
      const resolvedPath = isStateFormat 
        ? `state.${nodeName}${restOfPath ? '.' + restOfPath : ''}`
        : `${nodeName}${restOfPath ? '.' + restOfPath : ''}`;
      return resolvedPath;
    }
    
    return path;
  };
  
  const resolvedPath = resolveNodeName(readable);
  
  const isStateFormat = originalPath.startsWith('state.');
  const pathWithoutState = isStateFormat ? originalPath.substring(6) : originalPath;
  const pathParts = pathWithoutState.split('.');
  const varName = pathParts[pathParts.length - 1] || 'output';
  
  const getTypeIcon = (): React.ReactNode => {
    const pathWithoutStateForType = isStateFormat ? originalPath.substring(6) : originalPath;
    const parts = pathWithoutStateForType.split('.');
    
    if (parts.length >= 2) {
      const nodeId = parts[0];
      const node = nodes.find(n => n.id === nodeId);
      
      if (node) {
        const varNameLower = varName.toLowerCase();
        if (varNameLower.includes('string') || varNameLower.includes('text') || varNameLower.includes('name') || varNameLower.includes('message')) {
          return <Type className="w-3 h-3 text-blue-600" />;
        } else if (varNameLower.includes('number') || varNameLower.includes('count') || varNameLower.includes('id')) {
          return <Hash className="w-3 h-3 text-green-600" />;
        } else if (varNameLower.includes('boolean') || varNameLower.includes('is') || varNameLower.includes('has')) {
          return <ToggleLeft className="w-3 h-3 text-purple-600" />;
        } else if (varNameLower.includes('object') || varNameLower.includes('data') || varNameLower.includes('result')) {
          return <Folder className="w-3 h-3 text-orange-600" />;
        } else if (varNameLower.includes('array') || varNameLower.includes('list') || varNameLower.includes('items')) {
          return <List className="w-3 h-3 text-pink-600" />;
        }
      }
    }
    
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

