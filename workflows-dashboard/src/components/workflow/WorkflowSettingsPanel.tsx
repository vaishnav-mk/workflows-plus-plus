'use client';

import { Node } from 'reactflow';
import { CloudflareCard, CloudflareCardContent } from '../ui/CloudflareCard';
import { DynamicSettingsRenderer } from '../settings/DynamicSettingsRenderer';
import { RetryConfigSection } from '../settings/RetryConfigSection';
import { useNodeSettingsConfigs } from '../settings/NodeSettingsConfigs';
import { WorkflowStateView } from './WorkflowStateView';

interface WorkflowSettingsPanelProps {
  selectedNode: Node | null;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  onClose: () => void;
}

export function WorkflowSettingsPanel({ selectedNode, onNodeUpdate, onClose: _onClose }: WorkflowSettingsPanelProps) {
  const nodeSettingsConfigs = useNodeSettingsConfigs();

  // Get the configuration for this node type
  const nodeType = selectedNode?.data?.type || 'default';
  const settingsConfig = nodeSettingsConfigs[nodeType as string] || nodeSettingsConfigs['default'];

  return (
    <div className="w-96 settings-panel flex flex-col h-full overflow-hidden bg-white border-l border-gray-200">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Always show state view at the top */}
          <WorkflowStateView />

          {/* Only show node settings if a node is selected */}
          {selectedNode ? (
            <>
              <CloudflareCard className="w-full">
                <CloudflareCardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Node Settings: {selectedNode.data?.label || selectedNode.type}
                  </h3>
                  <div className="space-y-4">
                    {/* Dynamic Settings based on node type */}
                    <DynamicSettingsRenderer
                      fields={settingsConfig}
                      nodeData={selectedNode.data}
                      onNodeUpdate={onNodeUpdate}
                      nodeId={selectedNode.id}
                    />
                    
                    {/* Retry Configuration - available for all nodes */}
                    <RetryConfigSection
                      nodeData={selectedNode.data}
                      onNodeUpdate={onNodeUpdate}
                      nodeId={selectedNode.id}
                    />
                  </div>
                </CloudflareCardContent>
              </CloudflareCard>
            </>
          ) : (
            <CloudflareCard className="w-full">
              <CloudflareCardContent className="p-4">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔧</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Node</h3>
                  <p className="text-sm text-gray-500">Click on a node to configure its settings</p>
                </div>
              </CloudflareCardContent>
            </CloudflareCard>
          )}
        </div>
      </div>
    </div>
  );
}
