'use client';

import { NodePalette } from '@/components/workflow/NodePalette';
import { useNodeRegistry } from '@/hooks/useNodeRegistry';
import type { WorkflowSidebarProps } from '@/types/components';

export function WorkflowSidebar({ onAddNode, nodes, edges, edgeSelected = false }: WorkflowSidebarProps) {
  const { catalog } = useNodeRegistry();

  // Group nodes by type for stats
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nodesByType = catalog.reduce((acc, nodeDef) => {
    const count = nodes.filter(n => n.data?.type === nodeDef.type).length;
    if (count > 0) {
      acc[nodeDef.type] = { count, name: nodeDef.name, category: nodeDef.category };
    }
    return acc;
  }, {} as Record<string, { count: number; name: string; category: string }>);

  const entryNodes = nodes.filter(n => n.data?.type === 'entry');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const returnNodes = nodes.filter(n => n.data?.type === 'return');
  const controlNodes = nodes.filter(n => {
    const type = n.data?.type;
    return type === 'conditional-router' || type === 'for-each';
  });
  const httpNodes = nodes.filter(n => n.data?.type === 'http-request');
  const transformNodes = nodes.filter(n => n.data?.type === 'transform' || n.data?.type === 'validate');
  const storageNodes = nodes.filter(n => n.data?.type === 'kv_get' || n.data?.type === 'kv_put' || n.data?.type === 'd1-query');
  const timingNodes = nodes.filter(n => n.data?.type === 'sleep' || n.data?.type === 'wait-event');

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Workflow Builder</h2>
        <p className="text-sm text-gray-500">Drag nodes to build your workflow</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <NodePalette onAddNode={onAddNode} disabled={!edgeSelected} />
      </div>
      
      {/* Workflow Statistics */}
      <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
        <h3 className="font-semibold mb-2 text-gray-900">Workflow Stats</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Total Nodes:</span>
            <span className="text-gray-900 font-medium">{nodes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Connections:</span>
            <span className="text-gray-900 font-medium">{edges.length}</span>
          </div>
          
          {entryNodes.length > 0 && (
            <div className="flex justify-between mt-3 pt-3 border-t border-gray-200">
              <span className="text-gray-500">Control:</span>
              <span className="text-gray-900">{controlNodes.length}</span>
            </div>
          )}
          {httpNodes.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">HTTP:</span>
              <span className="text-gray-900">{httpNodes.length}</span>
            </div>
          )}
          {transformNodes.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Transform:</span>
              <span className="text-gray-900">{transformNodes.length}</span>
            </div>
          )}
          {storageNodes.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Storage:</span>
              <span className="text-gray-900">{storageNodes.length}</span>
            </div>
          )}
          {timingNodes.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Timing:</span>
              <span className="text-gray-900">{timingNodes.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
