'use client';

import { EmptyState } from '@/components';
import { DynamicSettingsRenderer } from '@/components/settings/DynamicSettingsRenderer';
import { RetryConfigSection } from '@/components/settings/RetryConfigSection';
import { useNodeSettingsConfigs } from '@/components/settings/NodeSettingsConfigs';
import { WorkflowStateView } from '@/components/workflow/WorkflowStateView';
import { NodeExecutionPanel } from '@/components/workflow/NodeExecutionPanel';
import type { WorkflowSettingsPanelProps } from '@/types/components';

export function WorkflowSettingsPanel({ selectedNode, onNodeUpdate, onClose: _onClose }: WorkflowSettingsPanelProps) {
  const nodeSettingsConfigs = useNodeSettingsConfigs();

  const nodeType = selectedNode?.data?.type || 'default';
  const settingsConfig = nodeSettingsConfigs[nodeType as string] || nodeSettingsConfigs['default'];

  return (
    <div className="w-96 settings-panel flex flex-col h-full overflow-hidden bg-white border-l border-gray-200">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <WorkflowStateView />

          {selectedNode ? (
            <>
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {typeof selectedNode.data?.label === 'string' ? selectedNode.data.label : (selectedNode.type || 'Node')}
                  </h2>
                  {typeof selectedNode.data?.description === 'string' && selectedNode.data.description && (
                    <p className="text-sm text-gray-500 mb-4">
                      {selectedNode.data.description}
                    </p>
                  )}
                </div>

                <DynamicSettingsRenderer
                  fields={settingsConfig}
                  nodeData={selectedNode.data}
                  onNodeUpdate={onNodeUpdate}
                  nodeId={selectedNode.id}
                />
                
                <RetryConfigSection
                  nodeData={selectedNode.data}
                  onNodeUpdate={onNodeUpdate}
                  nodeId={selectedNode.id}
                />
              </div>

              <div className="mt-6">
                <NodeExecutionPanel node={selectedNode} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                title="Select a Node"
                description="Click on a node to configure its settings"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
