'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useNodeRegistry } from '@/hooks/useNodeRegistry';
import type { NodePaletteProps } from '@/types/components';

export function NodePalette({ onAddNode, disabled = false }: NodePaletteProps) {
  const { catalog, loading } = useNodeRegistry();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter out entry/return nodes
  const availableNodes = catalog.filter(
    node => node.type !== 'entry' && node.type !== 'return'
  );

  // Filter by search
  const filteredNodes = searchTerm
    ? availableNodes.filter(node =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : availableNodes;

  // Group by category
  const nodesByCategory = filteredNodes.reduce((acc, node) => {
    const category = node.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(node);
    return acc;
  }, {} as Record<string, typeof filteredNodes>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
        {disabled && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Click on a connection to insert a node
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {Object.keys(nodesByCategory).length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            {searchTerm ? 'No nodes found' : 'No nodes available'}
          </div>
        ) : (
          Object.entries(nodesByCategory).map(([category, nodes]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">
                {category}
              </h3>
              <div className="space-y-2">
                {nodes.map(node => (
                  <button
                    key={node.type}
                    onClick={() => !disabled && onAddNode(node.type)}
                    disabled={disabled}
                    className={`
                      w-full text-left p-3 rounded-lg border-2 transition-all
                      ${disabled 
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' 
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                      }
                    `}
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: disabled ? '#d1d5db' : (node.color || '#6b7280')
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: disabled ? '#d1d5db' : (node.color || '#6b7280')
                        }}
                      />
                      <div className="font-medium text-sm">{node.name}</div>
                    </div>
                    {node.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2 ml-5">
                        {node.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
