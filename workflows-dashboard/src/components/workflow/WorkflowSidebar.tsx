"use client";

import { NodePalette } from "@/components/workflow/NodePalette";
import { useNodeRegistry } from "@/hooks/useNodeRegistry";
import type { WorkflowSidebarProps } from "@/types/components";

export function WorkflowSidebar({
  onAddNode,
  nodes,
  edges,
  edgeSelected = false
}: WorkflowSidebarProps) {

  return (
    <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-gray-200 flex flex-col overflow-hidden shadow-lg">
      <div className="p-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">
          Workflow Builder
        </h2>
        <p className="text-sm text-gray-500">
          Drag nodes to build your workflow
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <NodePalette onAddNode={onAddNode} disabled={!edgeSelected} />
      </div>
    </div>
  );
}
