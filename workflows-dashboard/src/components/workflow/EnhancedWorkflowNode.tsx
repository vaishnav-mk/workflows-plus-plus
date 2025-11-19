'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Settings, Play, Pause, AlertCircle, CheckCircle, Clock, 
  Globe, Database, Code, Bell, GitBranch, Repeat, AlertTriangle,
  GitMerge, RotateCw, CheckSquare, Brain, X
} from 'lucide-react';
import { useState, useCallback, memo } from 'react';
import { BrainSuggestionPopup } from '../ai/BrainSuggestionPopup';
import { useWorkflowContext } from '../../contexts/WorkflowContext';
import { useWorkflowStore } from '../../stores/workflowStore';

interface EnhancedWorkflowNodeProps extends NodeProps {
  id: string;
  data: {
    label: string;
    type: string;
    icon: string;
    description: string;
    status?: string;
    config?: Record<string, unknown>;
    isAIGenerated?: boolean;
  };
  selected: boolean;
  style?: React.CSSProperties;
}

const EnhancedWorkflowNodeComponent = ({ id, data, selected, style }: EnhancedWorkflowNodeProps) => {
  const { onBrainClick, onBrainAccept, nodes, edges } = useWorkflowContext();
  const { removeNode, setSelectedEdge } = useWorkflowStore();
  const [showBrainPopup, setShowBrainPopup] = useState(false);
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(false);
  const [description, setDescription] = useState('');
  const [suggestionPosition, setSuggestionPosition] = useState({ x: 0, y: 0 });
  


  const getNodeLabel = (type: string) => {
    switch (type) {
      case 'entry': return { text: 'START', class: 'node-label-start', icon: <Play className="w-3 h-3" /> };
      case 'return': return { text: 'END', class: 'node-label-end', icon: <CheckCircle className="w-3 h-3" /> };
      case 'conditional': return { text: 'SPLIT', class: 'node-label-split', icon: <GitBranch className="w-3 h-3" /> };
      case 'http-request': return { text: 'MODEL', class: 'node-label-model', icon: <Globe className="w-3 h-3" /> };
      case 'kv-get': return { text: 'KV GET', class: 'node-label-kv', icon: <Database className="w-3 h-3" /> };
      case 'kv-put': return { text: 'KV PUT', class: 'node-label-kv', icon: <Database className="w-3 h-3" /> };
      case 'd1-query': return { text: 'DATABASE', class: 'node-label-model', icon: <Database className="w-3 h-3" /> };
      case 'transform': return { text: 'TRANSFORM', class: 'node-label-model', icon: <Code className="w-3 h-3" /> };
      case 'sleep': return { text: 'SLEEP', class: 'node-label-model', icon: <Clock className="w-3 h-3" /> };
      case 'wait-event': return { text: 'WAIT', class: 'node-label-model', icon: <Bell className="w-3 h-3" /> };
      case 'validate': return { text: 'VALIDATE', class: 'node-label-model', icon: <CheckSquare className="w-3 h-3" /> };
      case 'for-each': return { text: 'LOOP', class: 'node-label-model', icon: <Repeat className="w-3 h-3" /> };
      default: return { text: 'NODE', class: 'node-label-model', icon: <Code className="w-3 h-3" /> };
    }
  };

  const nodeLabel = getNodeLabel(data.type);

  // Determine status-driven colors (fallbacks if style not provided)
  const statusColor = (() => {
    const status = (data.status || '').toLowerCase();
    if (status === 'completed' || status === 'success' || status === 'complete') return '#A8E9C0'; // green (custom)
    if (status === 'failed' || status === 'error' || status === 'errored') return '#ef4444'; // red
    if (status === 'running') return '#3b82f6'; // blue
    if (status === 'pending') return '#fbbf24'; // yellow
    return undefined;
  })();
  
  // Text color on dark backgrounds (for failed/running statuses)
  const textOnDark = (() => {
    const status = (data.status || '').toLowerCase();
    return status === 'failed' || status === 'running';
  })();

  const handleBrainClick = useCallback(() => {
    if (!description.trim()) return;
    
    if (onBrainClick) {
      onBrainClick(id, description);
    }
    
    setShowBrainPopup(false);
    setShowSuggestionPopup(true);
    setSuggestionPosition({ x: 300, y: 200 }); // Position for the suggestion popup
    setDescription('');
  }, [description, onBrainClick, id]);

  const handleDeleteNode = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this node?')) {
      removeNode(id);
    }
  }, [id, removeNode]);

  const handleSuggestionAccept = useCallback((suggestions: any[]) => {
    if (onBrainAccept) {
      onBrainAccept(id, suggestions);
    }
    setShowSuggestionPopup(false);
  }, [onBrainAccept, id]);

        return (
    <div className="relative group">
      {/* Node Label - Always show, touching the node */}
      <div className={`${nodeLabel.class} absolute -top-6 left-1/2 transform -translate-x-1/2 z-10`}>
        <span>{nodeLabel.icon}</span>
        <span>{nodeLabel.text}</span>
          </div>
      
      <div 
        className={`px-4 py-3 rounded-lg border min-w-[200px] max-w-[250px] relative transition-colors ${
          data.isAIGenerated 
            ? 'border-purple-200 hover:border-purple-300 shadow-sm' 
            : 'border-gray-200 hover:border-blue-300'
        }`}
        style={{
          backgroundColor: style?.backgroundColor || statusColor || (data.isAIGenerated ? undefined : 'white'),
          color: style?.color || (textOnDark ? 'white' : undefined),
          border: style?.border || undefined,
          borderRadius: style?.borderRadius || undefined,
          ...style
        }}
      >
        
        {/* Close Button */}
        {data.type !== 'entry' && data.type !== 'return' && (
          <button 
            className="node-close-btn"
            onClick={handleDeleteNode}
            title="Delete node"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        
        {/* AI Generated Indicator */}
        {data.isAIGenerated && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center shadow-sm">
            <Brain className="w-2.5 h-2.5 text-white" />
          </div>
        )}

        {/* Brain Button */}
        {/* {data.type !== 'entry' && data.type !== 'return' && data.isAIGenerated !== true && (
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onBrainClick) {
                onBrainClick(id, 'Generate workflow suggestions');
              }
              setShowBrainPopup(true);
            }}
            title="AI Workflow Suggestions"
            style={{
              position: 'absolute',
              top: '30px',
              right: '8px',
              width: '24px',
              height: '24px',
              backgroundColor: '#8b5cf6',
              border: '2px solid #7c3aed',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1000,
              pointerEvents: 'auto'
            }}
          >
            <Brain className="w-3 h-3 text-white" />
                </button>
        )} */}
        
        <Handle
          type="target"
          position={Position.Top}
          className="w-2 h-2"
        />
        
          <div className="flex items-center space-x-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 truncate">{data.label || 'Node'}</div>
            <div className="text-xs text-gray-600 truncate">{data.description || 'Workflow node'}</div>
          </div>
        </div>
        
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-2 h-2"
        />
      </div>


      {/* Brain Input Popup */}
      {showBrainPopup && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
              <Brain className="w-4 h-4 text-purple-600" />
              <span>AI Workflow Suggestions</span>
            </h3>
            <button 
              onClick={() => setShowBrainPopup(false)}
              className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-3 h-3 text-gray-600" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Describe the next workflows you want:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., 'Add user authentication, then validate the request, and finally save to database'"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                rows={3}
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleBrainClick}
                disabled={!description.trim()}
                className="flex-1 px-3 py-2 text-sm bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <Brain className="w-4 h-4" />
                <span>Generate Workflow</span>
              </button>
              <button
                onClick={() => setShowBrainPopup(false)}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brain Suggestion Popup */}
      {showSuggestionPopup && (
        <BrainSuggestionPopup
          nodeId={id}
          nodeType={data.type}
          nodeLabel={data.label}
          description={description}
          position={suggestionPosition}
          sourceNodePosition={{ x: 100, y: 200 }}
          onClose={() => setShowSuggestionPopup(false)}
          onAccept={handleSuggestionAccept}
          mainWorkflowNodes={nodes}
          mainWorkflowEdges={edges}
        />
      )}
    </div>
  );
};

export const EnhancedWorkflowNode = memo(EnhancedWorkflowNodeComponent);