'use client';

import { 
  Code,
  Rocket,
  Server
} from 'lucide-react';
import { Button, Spinner, Checkbox } from '@/components';

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
    <div className="flex items-center gap-3">
      {onMCPToggle && (
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4" />
          <Checkbox
            checked={mcpEnabled}
            onChange={(e) => onMCPToggle(e.target.checked)}
            label="MCP"
          />
        </div>
      )}
      
      <Button
        variant="secondary"
        size="sm"
        onClick={onCodePreview}
      >
        <Code className="w-4 h-4 mr-1.5" />
        Code
      </Button>
      
      <Button
        variant="primary"
        size="sm"
        onClick={onDeploy}
        disabled={isDeploying || hasErrors}
      >
        {isDeploying ? (
          <>
            <Spinner size="sm" className="mr-1.5" />
            Deploying...
          </>
        ) : (
          <>
            <Rocket className="w-4 h-4 mr-1.5" />
            Deploy
          </>
        )}
      </Button>
    </div>
  );
}

