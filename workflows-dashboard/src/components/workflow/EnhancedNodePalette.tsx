/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { 
  Play, CheckCircle, GitBranch, Globe, Database, Code, Clock,
  CheckSquare, Save, ArrowRight, Search, Repeat, Pause, ArrowRightToLine, ArrowLeftFromLine, Brain, Server
} from 'lucide-react';
import { useNodeRegistry } from '@/hooks/useNodeRegistry';

interface EnhancedNodePaletteProps {
  onAddNode: (type: string) => void;
  registry?: { nodes: { name: string; category: string }[] };
}

const iconMap: Record<string, any> = {
  Play,
  CheckCircle,
  GitBranch,
  Globe,
  Database,
  Code,
  Clock,
  CheckSquare,
  Save,
  Repeat,
  Pause,
  "Input": ArrowRightToLine,
  "Output": ArrowLeftFromLine,
  Brain,
  Server
};

export function EnhancedNodePalette({ onAddNode, registry: _registry }: EnhancedNodePaletteProps) {
  const { nodes, loading } = useNodeRegistry();
  
  // Filter out entry and return nodes - they should not be manually added
  const filteredNodes = nodes.filter(
    node => node.metadata.type !== 'entry' && node.metadata.type !== 'return'
  );
  
  const [searchTerm, setSearchTerm] = useState('');

  // Group nodes by category for better organization
  const nodesByCategory: Record<string, typeof filteredNodes> = {};
  
  filteredNodes.forEach(node => {
    const category = node.metadata.category;
    if (!nodesByCategory[category]) {
      nodesByCategory[category] = [];
    }
    nodesByCategory[category].push(node);
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(filteredNodes.map(n => n.metadata.category)))];

  // Filter nodes based on search
  const filteredNodesByCategory: Record<string, typeof filteredNodes> = {};
  Object.entries(nodesByCategory).forEach(([category, categoryNodes]) => {
    if (!searchTerm) {
      filteredNodesByCategory[category] = categoryNodes;
      return;
    }

    const filtered = categoryNodes.filter(node =>
      node.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.metadata.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    if (filtered.length > 0) {
      filteredNodesByCategory[category] = filtered;
    }
  });

  const categoryNames: Record<string, string> = {
    control: 'Control Flow',
    http: 'HTTP & APIs',
    storage: 'Storage',
    database: 'Database',
    transform: 'Transform',
    timing: 'Timing',
    mcp: 'MCP',
    ai: 'AI'
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || Code;
    return Icon;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      control: 'text-blue-600 bg-blue-50 border-blue-200',
      http: 'text-orange-600 bg-orange-50 border-orange-200',
      storage: 'text-purple-600 bg-purple-50 border-purple-200',
      database: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      transform: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      timing: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      mcp: 'text-purple-600 bg-purple-50 border-purple-200',
      ai: 'text-green-600 bg-green-50 border-green-200'
    };
    return colors[category] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(filteredNodesByCategory).map(([category, categoryNodes]) => (
          <div key={category} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              {categoryNames[category] || category}
            </h3>
            <div className="space-y-2">
              {categoryNodes.map(node => {
                const Icon = getIcon(node.metadata.icon);
                const colors = getCategoryColor(category);

                return (
                  <button
                    key={node.metadata.type}
                    onClick={() => onAddNode(node.metadata.type)}
                    className={`w-full text-left p-3 rounded-lg border ${colors} hover:shadow-md transition-all group relative`}
                    title={node.metadata.description}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-1.5 rounded bg-white/50 group-hover:bg-white transition-colors">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm group-hover:underline truncate">
                            {node.metadata.name}
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                            {node.metadata.description}
                          </div>
                          {node.bindings.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {node.bindings.map(binding => (
                                <span key={binding.type} className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                                  {binding.type}
                                </span>
                              ))}
                              {!node.capabilities.playgroundCompatible && (
                                <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                  Cloudflare Only
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

