'use client';

import { Handle, Position, NodeProps } from 'reactflow';

interface WorkflowNodeData {
  label: string;
  type: string;
  icon: string;
  description: string;
}

export function WorkflowNode({ data }: NodeProps<WorkflowNodeData>) {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'worker':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'database':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'storage':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'api':
        return 'bg-indigo-50 border-indigo-200 text-indigo-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 min-w-[200px] ${getNodeColor(data.type)}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
      
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{data.icon}</div>
        <div>
          <div className="font-semibold text-sm">{data.label}</div>
          <div className="text-xs opacity-75">{data.description}</div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </div>
  );
}
