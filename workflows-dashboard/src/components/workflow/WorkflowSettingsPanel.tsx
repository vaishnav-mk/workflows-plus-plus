'use client';

import { useState } from 'react';
import { EmptyState, Tabs, Tab } from '@/components';
import { DynamicSettingsRenderer } from '@/components/settings/DynamicSettingsRenderer';
import { RetryConfigSection } from '@/components/settings/RetryConfigSection';
import { useNodeSettingsConfigs } from '@/components/settings/NodeSettingsConfigs';
import { WorkflowStateView } from '@/components/workflow/WorkflowStateView';
import { NodeExecutionPanel } from '@/components/workflow/NodeExecutionPanel';
import type { WorkflowSettingsPanelProps } from '@/types/components';
import { Database, Settings } from 'lucide-react';

export function WorkflowSettingsPanel({ selectedNode, onNodeUpdate, onClose: _onClose }: WorkflowSettingsPanelProps) {
  const nodeSettingsConfigs = useNodeSettingsConfigs();
  const [activeTab, setActiveTab] = useState(0);

  const nodeType = selectedNode?.data?.type || 'default';
  const settingsConfig = nodeSettingsConfigs[nodeType as string] || nodeSettingsConfigs['default'];

  return (
    <div className="w-96 settings-panel flex flex-col h-full overflow-hidden bg-white/80 backdrop-blur-sm border-l border-gray-200 shadow-lg">
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedNode ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {typeof selectedNode.data?.label === 'string' ? selectedNode.data.label : (selectedNode.type || 'Node')}
              </h2>
              {typeof selectedNode.data?.description === 'string' && selectedNode.data.description && (
                <p className="text-sm text-gray-500">
                  {selectedNode.data.description}
                </p>
              )}
            </div>

            <div className="border-b border-gray-200 bg-white/90 backdrop-blur-sm">
              <Tabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                className="relative z-10"
              >
                <Tab>
                  <div className="flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    <span>State</span>
                  </div>
                </Tab>
                <Tab>
                  <div className="flex items-center gap-1.5">
                    <Settings className="w-4 h-4" />
                    <span>Node</span>
                  </div>
                </Tab>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {activeTab === 0 ? (
                <WorkflowStateView />
              ) : (
                <div className="space-y-4">
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

                  <NodeExecutionPanel node={selectedNode} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <EmptyState
              title="Select a Node"
              description="Click on a node to configure its settings"
            />
          </div>
        )}
      </div>
    </div>
  );
}
