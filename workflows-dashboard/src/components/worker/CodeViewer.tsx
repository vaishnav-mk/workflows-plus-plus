"use client";

import { CopyButton } from "@/components";
import type { Module, FileTreeNode } from "@/types/worker";
import { decodeModuleContent } from "@/utils/file-tree";
import { FileTreeItem } from "./FileTreeItem";

interface CodeViewerProps {
  selectedModule: Module | null;
  modules: Module[];
  fileTree: FileTreeNode[];
  selectedModulePath: string | null;
  onSelectModule: (path: string) => void;
}

export function CodeViewer({
  selectedModule,
  modules,
  fileTree,
  selectedModulePath,
  onSelectModule
}: CodeViewerProps) {
  if (modules.length === 0) {
    return (
      <div className="p-6">
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">
              Default Worker Code
            </h3>
          </div>
          <div className="relative">
            <div className="absolute top-3 right-3 z-10">
              <CopyButton
                text={`export default {\n  async fetch(request) {\n    return new Response('Hello World!');\n  }\n};`}
                size="md"
              />
            </div>
            <pre className="text-sm text-gray-800 p-5 overflow-x-auto font-mono leading-relaxed bg-gray-50">
              {`export default {\n  async fetch(request) {\n    return new Response('Hello World!');\n  }\n};`}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row max-h-[70vh] min-h-[420px] border-t border-gray-200">
      <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Files</span>
          <span className="text-xs text-gray-500">{modules.length} modules</span>
        </div>
        <div className="p-2">
          {fileTree.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              level={0}
              selectedPath={selectedModulePath}
              onSelect={onSelectModule}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0 bg-white text-gray-900 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wide text-gray-400">
              {selectedModule
                ? selectedModule.content_type
                : "text/plain"}
            </span>
            {selectedModule && (
              <span className="text-sm font-mono text-gray-800 truncate max-w-[280px]">
                {selectedModule.name}
              </span>
            )}
          </div>
          {selectedModule && (
            <CopyButton
              text={decodeModuleContent(selectedModule)}
              size="sm"
            />
          )}
        </div>
        <div className="flex-1 overflow-auto">
          <div className="h-full bg-gray-50">
            {selectedModule ? (
              <pre className="text-xs sm:text-sm leading-relaxed font-mono px-4 py-4 whitespace-pre text-gray-900">
                {decodeModuleContent(selectedModule)}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                No file selected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

