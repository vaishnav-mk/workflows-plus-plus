'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useNodeRegistry } from '@/hooks/useNodeRegistry';
import { WORKFLOW_NODE_ICON_MAP } from '@/config/workflow-node-icons';
import { Code } from 'lucide-react';
import type { NodePaletteProps } from '@/types/components';

export function NodePalette({ onAddNode, disabled = false }: NodePaletteProps) {
  const { catalog, loading } = useNodeRegistry();
  const [searchTerm, setSearchTerm] = useState('');

  const availableNodes = catalog.filter(
    node => node.type !== 'entry' && node.type !== 'return'
  );

  const filteredNodes = searchTerm
    ? availableNodes.filter(node =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : availableNodes;

  const nodesByCategory = filteredNodes.reduce((acc, node) => {
    const category = node.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(node);
    return acc;
  }, {} as Record<string, typeof filteredNodes>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all bg-white"
          />
        </div>
        {disabled && (
          <p className="text-[10px] text-gray-400 mt-1.5 text-center">
            Select a connection to add node
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        {Object.keys(nodesByCategory).length === 0 ? (
          <div className="text-center text-gray-400 text-xs py-8">
            {searchTerm ? 'No results' : 'No nodes'}
          </div>
        ) : (
          Object.entries(nodesByCategory).map(([category, nodes]) => (
            <div key={category} className="mb-3">
              <h3 className="text-[10px] font-semibold text-gray-500 mb-1.5 px-1.5 uppercase tracking-wider">
                {category}
              </h3>
              <div className="space-y-1">
                {nodes.map(node => {
                  const IconComponent = WORKFLOW_NODE_ICON_MAP[node.icon] || Code;
                  const nodeColor = node.color || '#6b7280';
                  
                  return (
                    <button
                      key={node.type}
                      onClick={() => !disabled && onAddNode(node.type)}
                      disabled={disabled}
                      className={`
                        w-full text-left px-2 py-1.5 rounded-md border transition-all
                        ${disabled
                          ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-40'
                          : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/30 cursor-pointer'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="p-1 rounded flex-shrink-0"
                          style={{ 
                            backgroundColor: disabled ? '#f3f4f6' : `${nodeColor}10`,
                            color: disabled ? '#9ca3af' : nodeColor
                          }}
                        >
                          <IconComponent className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {node.name}
                          </div>
                          {node.description && (
                            <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 break-words">
                              {node.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
