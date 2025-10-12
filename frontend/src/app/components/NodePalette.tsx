'use client';

import { useState } from 'react';
import { 
  Globe, 
  Zap, 
  Database, 
  HardDrive, 
  Cloud, 
  Code, 
  Settings,
  ArrowRight,
  Plus
} from 'lucide-react';

interface NodePaletteProps {
  onAddNode: (type: string, data: any) => void;
}

const nodeTypes = [
  {
    type: 'trigger',
    label: 'HTTP Request',
    icon: Globe,
    description: 'Incoming HTTP request',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    type: 'worker',
    label: 'Worker',
    icon: Zap,
    description: 'Cloudflare Worker',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  {
    type: 'database',
    label: 'D1 Database',
    icon: Database,
    description: 'D1 Database query',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    type: 'storage',
    label: 'KV Storage',
    icon: HardDrive,
    description: 'Key-Value storage',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    type: 'api',
    label: 'External API',
    icon: Cloud,
    description: 'External API call',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  {
    type: 'code',
    label: 'Code Block',
    icon: Code,
    description: 'Custom JavaScript code',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  {
    type: 'config',
    label: 'Configuration',
    icon: Settings,
    description: 'Workflow configuration',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
];

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNodes = nodeTypes.filter(node =>
    node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Node Types</h3>
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div className="space-y-2">
        {filteredNodes.map((nodeType) => {
          const IconComponent = nodeType.icon;
          return (
            <div
              key={nodeType.type}
              onClick={() => onAddNode(nodeType.type, {
                label: nodeType.label,
                icon: nodeType.icon.name,
                description: nodeType.description
              })}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-105 ${nodeType.bgColor} ${nodeType.borderColor} hover:shadow-md`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-md ${nodeType.bgColor}`}>
                  <IconComponent className={`w-4 h-4 ${nodeType.color}`} />
                </div>
                <div className="flex-1">
                  <div className={`font-medium text-sm ${nodeType.color}`}>
                    {nodeType.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {nodeType.description}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-3 bg-gray-700 rounded-lg">
        <div className="flex items-center space-x-2 text-sm text-gray-300">
          <Plus className="w-4 h-4" />
          <span>Drag nodes to canvas to add them</span>
        </div>
      </div>
    </div>
  );
}
