'use client';

import React, { memo } from 'react';
import { Check, X } from 'lucide-react';
import { useNodeRegistry } from '@/hooks/useNodeRegistry';

interface MinimapNode {
  id: string;
  type: string;
  label: string;
  icon: string;
  x: number;
  y: number;
}

interface MinimapEdge {
  id: string;
  source: string;
  target: string;
  style?: string;
}

interface WorkflowMinimapProps {
  nodes: MinimapNode[];
  edges: MinimapEdge[];
  onAccept: () => void;
  onReject: () => void;
  sourceNodePosition?: { x: number; y: number };
}

const WorkflowMinimapComponent: React.FC<WorkflowMinimapProps> = ({
  nodes,
  edges,
  onAccept,
  onReject
}) => {
  const { getNodeByType } = useNodeRegistry();

  const getNodeIcon = (type: string) => {
    const nodeDef = getNodeByType(type);
    if (nodeDef) {
      // Return emoji based on backend category or icon
      const iconMap: Record<string, string> = {
        'Globe': '🌐',
        'Database': '🗄️',
        'Code': '⚙️',
        'Clock': '⏰',
        'CheckCircle': '✔️',
        'Repeat': '🔄',
        'GitBranch': '🔀',
        'Play': '▶️',
        'Check': '✅',
        'Pause': '⏸️',
      };
      return iconMap[nodeDef.metadata.icon] || '📦';
    }
    return '📦'; // Default fallback
  };

  const getNodeLabel = (type: string) => {
    const nodeDef = getNodeByType(type);
    if (nodeDef) {
      return nodeDef.metadata.name.toUpperCase();
    }
    return 'NODE';
  };

  const getNodeLabelClass = (type: string) => {
    const nodeDef = getNodeByType(type);
    if (nodeDef) {
      return `node-label-${nodeDef.metadata.category}`;
    }
    return 'node-label-default';
  };

  const getNodeDescription = (type: string) => {
    const nodeDef = getNodeByType(type);
    if (nodeDef) {
      return nodeDef.metadata.description;
    }
    return 'Workflow node';
  };

  const getNodeColor = (type: string, isSource: boolean = false) => {
    if (isSource) return 'bg-blue-100 border-blue-400 border-2';
    
    const nodeDef = getNodeByType(type);
    if (nodeDef) {
      // Use the color from backend metadata
      const colorMap: Record<string, string> = {
        '#10B981': 'bg-green-100 border-green-300',
        '#EF4444': 'bg-red-100 border-red-300',
        '#3B82F6': 'bg-blue-100 border-blue-300',
        '#8B5CF6': 'bg-purple-100 border-purple-300',
        '#F59E0B': 'bg-yellow-100 border-yellow-300',
        '#6B7280': 'bg-gray-100 border-gray-300',
        '#FB923C': 'bg-orange-100 border-orange-300',
        '#14B8A6': 'bg-emerald-100 border-emerald-300',
        '#06B6D4': 'bg-cyan-100 border-cyan-300',
      };
      
      // Extract base color from hex (simplified mapping)
      const categoryMap: Record<string, string> = {
        'control': 'bg-blue-100 border-blue-300',
        'http': 'bg-purple-100 border-purple-300',
        'storage': 'bg-yellow-100 border-yellow-300',
        'database': 'bg-orange-100 border-orange-300',
        'transform': 'bg-gray-100 border-gray-300',
        'timing': 'bg-cyan-100 border-cyan-300',
        'ai': 'bg-indigo-100 border-indigo-300',
        'messaging': 'bg-pink-100 border-pink-300',
      };
      
      return categoryMap[nodeDef.metadata.category] || colorMap[nodeDef.metadata.color] || 'bg-gray-100 border-gray-300';
    }
    return 'bg-gray-100 border-gray-300';
  };

  return (
    <div className="fixed inset-0 bg-transparent z-50">
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">AI Generated Workflow</h2>
          <button
            onClick={onReject}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Minimap Container - Full Screen */}
        <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 bg-transparent flex-1 overflow-hidden" style={{
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
          height: 'calc(100vh - 120px)',
          width: '100%'
        }}>
          <div className="relative w-full h-full">
            {/* Render nodes - styled exactly like main workflow nodes */}
            {nodes.map((node, index) => (
              <div
                key={node.id}
                className="absolute bg-white border border-gray-200 rounded-lg px-4 py-3 min-w-[200px] max-w-[250px] hover:border-blue-300 transition-colors"
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {/* Node Label - same as main workflow */}
                <div className={`${getNodeLabelClass(node.type)} absolute -top-6 left-1/2 transform -translate-x-1/2 z-10`}>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs">{getNodeIcon(node.type)}</span>
                    <span className="text-xs font-medium">{getNodeLabel(node.type)}</span>
                  </div>
                </div>
                
                {/* Node Content - same as main workflow */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-lg">{getNodeIcon(node.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{node.label}</div>
                    <div className="text-xs text-gray-600 truncate">{getNodeDescription(node.type)}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Render edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {edges.map((edge) => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);
                
                if (!sourceNode || !targetNode) return null;

                const startX = sourceNode.x;
                const startY = sourceNode.y + 32; // Bottom of source node
                const endX = targetNode.x;
                const endY = targetNode.y - 32; // Top of target node

                return (
                  <g key={edge.id}>
                    <defs>
                      <marker
                        id={`arrowhead-${edge.id}`}
                        markerWidth="8"
                        markerHeight="6"
                        refX="7"
                        refY="3"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 8 3, 0 6"
                          fill="#3b82f6"
                        />
                      </marker>
                    </defs>
                    <line
                      x1={startX}
                      y1={startY}
                      x2={endX}
                      y2={endY}
                      stroke={edge.style === 'dashed' ? '#6b7280' : '#3b82f6'}
                      strokeWidth="2"
                      strokeDasharray={edge.style === 'dashed' ? '5,5' : 'none'}
                      markerEnd={`url(#arrowhead-${edge.id})`}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Accept/Reject Buttons */}
        <div className="flex justify-center space-x-4 mt-6">
          <button
            onClick={onReject}
            className="flex items-center space-x-2 px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors border-2 border-dashed border-red-300"
          >
            <X className="w-5 h-5" />
            <span className="font-medium">Reject</span>
          </button>
          <button
            onClick={onAccept}
            className="flex items-center space-x-2 px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors border-2 border-dashed border-green-300"
          >
            <Check className="w-5 h-5" />
            <span className="font-medium">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const WorkflowMinimap = memo(WorkflowMinimapComponent);
