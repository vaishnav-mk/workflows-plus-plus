'use client';

import { useState } from 'react';
import { 
  Code,
  CheckCircle,
  AlertTriangle,
  Rocket,
  Server
} from 'lucide-react';
import { ButtonLoader } from '../../components/ui/Loader';

interface WorkflowToolbarProps {
  onCodePreview?: () => void;
  onDeploy?: () => void;
  isDeploying?: boolean;
  mcpEnabled?: boolean;
  onMCPToggle?: (enabled: boolean) => void;
}

export function WorkflowToolbar({ 
  onCodePreview,
  onDeploy,
  isDeploying = false,
  mcpEnabled = false,
  onMCPToggle
}: WorkflowToolbarProps) {
  const hasErrors = false;

  return (
    <div className="flex items-center space-x-2">
      <button 
        onClick={() => onMCPToggle?.(!mcpEnabled)}
        className={`flex items-center space-x-2 border px-4 py-2 rounded-md transition-colors text-sm font-medium ${
          mcpEnabled
            ? 'border-purple-500 bg-purple-50 text-purple-700'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Server className="w-4 h-4" />
        <span>MCP</span>
      </button>
      
      <button 
        onClick={onCodePreview}
        className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
      >
        <Code className="w-4 h-4" />
        <span>Code</span>
      </button>
      
      <button 
        onClick={onDeploy}
        disabled={isDeploying || hasErrors}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          isDeploying || hasErrors
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isDeploying ? (
          <ButtonLoader text="Deploying..." />
        ) : (
          <>
            <Rocket className="w-4 h-4" />
            <span>Deploy</span>
          </>
        )}
      </button>
      
    </div>
  );
}
