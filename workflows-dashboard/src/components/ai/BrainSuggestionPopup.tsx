'use client';

import React, { useState, useEffect, memo } from 'react';
import { X, Check, Brain } from 'lucide-react';
import { WorkflowMinimap } from './WorkflowMinimap';
import { InlineLoader } from '../ui/Loader';

interface SuggestedNode {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: string;
}

interface BrainSuggestionPopupProps {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  description: string;
  position: { x: number; y: number };
  sourceNodePosition?: { x: number; y: number };
  onClose: () => void;
  onAccept: (suggestions: SuggestedNode[]) => void;
  mainWorkflowNodes?: any[];
  mainWorkflowEdges?: any[];
}

const BrainSuggestionPopupComponent: React.FC<BrainSuggestionPopupProps> = ({
  nodeId,
  nodeType,
  nodeLabel,
  description,
  position,
  sourceNodePosition,
  onClose,
  onAccept,
  mainWorkflowNodes = [],
  mainWorkflowEdges = []
}) => {
  const [suggestions, setSuggestions] = useState<SuggestedNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMinimap, setShowMinimap] = useState(false);

  // Parse description and generate suggestions
  useEffect(() => {
    const generateSuggestions = async () => {
      setLoading(true);
      
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const words = description.toLowerCase().split(/\s+/);
      const suggestedNodes: SuggestedNode[] = [];
      
      // Simple keyword matching for demo
      if (words.includes('validate') || words.includes('validation')) {
        suggestedNodes.push({
          id: 'brain-1',
          type: 'validate',
          label: 'Validate Input',
          description: 'Check user permissions and data',
          icon: '✔️'
        });
      }
      
      if (words.includes('transform') || words.includes('process')) {
        suggestedNodes.push({
          id: 'brain-2',
          type: 'transform',
          label: 'Transform Data',
          description: 'Process and clean input data',
          icon: '⚙️'
        });
      }
      
      if (words.includes('database') || words.includes('save') || words.includes('store')) {
        suggestedNodes.push({
          id: 'brain-3',
          type: 'd1-query',
          label: 'Save to Database',
          description: 'Store data in database',
          icon: '🗄️'
        });
      }
      
      if (words.includes('api') || words.includes('request') || words.includes('call')) {
        suggestedNodes.push({
          id: 'brain-4',
          type: 'http-request',
          label: 'API Request',
          description: 'Make external API call',
          icon: '🌐'
        });
      }
      
      if (words.includes('conditional') || words.includes('if') || words.includes('check')) {
        suggestedNodes.push({
          id: 'brain-5',
          type: 'conditional',
          label: 'Conditional Logic',
          description: 'Add conditional branching',
          icon: '🔀'
        });
      }
      
      if (words.includes('wait') || words.includes('delay') || words.includes('sleep')) {
        suggestedNodes.push({
          id: 'brain-6',
          type: 'sleep',
          label: 'Wait',
          description: 'Add delay for processing',
          icon: '⏰'
        });
      }
      
      // Generate 2-3 random nodes to show subtree functionality
      const allNodeTypes = [
        { type: 'validate', label: 'Validate Data', description: 'Validate input data', icon: '✔️' },
        { type: 'transform', label: 'Transform Data', description: 'Transform the data', icon: '⚙️' },
        { type: 'conditional', label: 'Check Condition', description: 'Check if condition is met', icon: '🔀' },
        { type: 'http-request', label: 'API Call', description: 'Make HTTP request', icon: '🌐' },
        { type: 'kv-get', label: 'Get Data', description: 'Retrieve data from storage', icon: '💾' },
        { type: 'kv-put', label: 'Store Data', description: 'Store data in storage', icon: '💾' },
        { type: 'sleep', label: 'Wait', description: 'Add delay to workflow', icon: '⏰' },
        { type: 'for-each', label: 'Loop', description: 'Iterate over items', icon: '🔄' }
      ];
      
      // Randomly select 2-3 nodes
      const numNodes = Math.floor(Math.random() * 2) + 2; // 2 or 3 nodes
      const shuffled = allNodeTypes.sort(() => 0.5 - Math.random());
      const selectedNodes = shuffled.slice(0, numNodes);
      
      const randomSuggestions = selectedNodes.map((node, index) => ({
        id: `brain-${node.type}-${index}`,
        type: node.type,
        label: node.label,
        description: node.description,
        icon: node.icon
      }));
      
      // Add the random suggestions to show subtree functionality
      suggestedNodes.push(...randomSuggestions);
      
      setSuggestions(suggestedNodes);
      setLoading(false);
      setShowMinimap(true);
    };
    
    generateSuggestions();
  }, [description]);

  const handleAccept = () => {
    onAccept(suggestions);
    onClose();
  };

  const handleReject = () => {
    onClose();
  };

  // Create a proper sub-workflow structure that looks like the main workflow
  const createWorkflowStructure = () => {
    const nodes: any[] = [];
    const edges: any[] = [];
    
    // Add all main workflow nodes first
    mainWorkflowNodes.forEach(node => {
      nodes.push({
        id: node.id,
        type: node.data?.type || node.type,
        label: node.data?.label || node.label,
        icon: getNodeIcon(node.data?.type || node.type),
        x: node.position?.x || 0,
        y: node.position?.y || 0
      });
    });
    
    // Add main workflow edges
    mainWorkflowEdges.forEach(edge => {
      edges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        style: 'solid'
      });
    });
    
    // Create suggested nodes as a connected sub-workflow below the parent
    suggestions.forEach((suggestion, index) => {
      const nodeId_suggestion = `minimap-${suggestion.id}`;
      
      // Position nodes below the parent node, creating a vertical flow
      nodes.push({
        id: nodeId_suggestion,
        type: suggestion.type,
        label: suggestion.label,
        icon: getNodeIcon(suggestion.type),
        x: 200, // Same x position as parent for vertical alignment
        y: 200 + (index * 120) // Vertical spacing below parent
      });
      
      // Connect the sub-workflow to the main workflow
      if (index === 0) {
        // First suggestion connects to parent node with dashed line (temporary connection)
        edges.push({
          id: `edge-source-${index}`,
          source: nodeId,
          target: nodeId_suggestion,
          style: 'dashed'
        });
      } else {
        // Connect subsequent nodes in the sub-workflow with solid lines
        const prevNodeId = `minimap-${suggestions[index - 1].id}`;
        edges.push({
          id: `edge-${index - 1}-${index}`,
          source: prevNodeId,
          target: nodeId_suggestion,
          style: 'solid'
        });
      }
    });
    
    return { nodes, edges };
  };

  // Helper function to get node icons (same as main workflow)
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'entry': return '▶️';
      case 'return': return '✅';
      case 'conditional': return '🔀';
      case 'http-request': return '🌐';
      case 'kv-get': case 'kv-put': return '💾';
      case 'd1-query': return '🗄️';
      case 'transform': return '⚙️';
      case 'sleep': return '⏰';
      case 'wait-event': return '🔔';
      case 'validate': return '✔️';
      case 'for-each': return '🔄';
      default: return '📦';
    }
  };

  const { nodes: allNodes, edges: minimapEdges } = createWorkflowStructure();

  if (showMinimap) {
    return (
      <div className="fixed inset-0 z-50 bg-transparent">
        <WorkflowMinimap
          nodes={allNodes}
          edges={minimapEdges}
          onAccept={handleAccept}
          onReject={handleReject}
          sourceNodePosition={sourceNodePosition}
        />
      </div>
    );
  }

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md"
      style={{
        left: position.x + 20,
        top: position.y - 10,
        transform: 'translateY(-50%)'
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
          <Brain className="w-4 h-4 text-purple-600" />
          <span>AI Generated Workflow</span>
        </h3>
        <button
          onClick={onClose}
          className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <X className="w-3 h-3 text-gray-600" />
        </button>
      </div>

      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-2">Based on your description:</div>
        <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded border">
          "{description}"
        </div>
      </div>

      <div className="flex items-center justify-center py-8">
        <InlineLoader text="Generating AI suggestions..." />
      </div>
    </div>
  );
};

export const BrainSuggestionPopup = memo(BrainSuggestionPopupComponent);
