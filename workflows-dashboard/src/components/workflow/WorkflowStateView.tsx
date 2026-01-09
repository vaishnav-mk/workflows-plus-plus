"use client";

import React, { useState } from "react";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useNodeExecutionStore } from "@/stores/workflow/nodeExecutionStore";
import {
  ChevronRight,
  ChevronDown,
  Check,
  Type,
  Hash,
  ToggleLeft,
  Folder,
  List,
  FileJson
} from "lucide-react";
import type { StateTreeNode } from "@/types/components";

interface ExtendedStateTreeNode extends StateTreeNode {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  inputSource: string | null;
  presetOutput: any;
  expanded: boolean;
}

export function WorkflowStateView() {
  const { nodes, edges } = useWorkflowStore();
  const { executions } = useNodeExecutionStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const getNodeName = (nodeId: string): string => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      return typeof node.data?.label === "string"
        ? node.data.label
        : node.type || nodeId;
    }
    return nodeId;
  };

  const getTypeIcon = (type: string, value?: any): React.ReactNode => {
    const normalizedType = type.toLowerCase();

    if (normalizedType === "string" || normalizedType === "text") {
      return <Type className="w-3 h-3 text-blue-600" />;
    } else if (normalizedType === "number" || normalizedType === "integer") {
      return <Hash className="w-3 h-3 text-green-600" />;
    } else if (normalizedType === "boolean") {
      return <ToggleLeft className="w-3 h-3 text-purple-600" />;
    } else if (
      normalizedType === "object" ||
      (value && typeof value === "object" && !Array.isArray(value))
    ) {
      return <Folder className="w-3 h-3 text-orange-600" />;
    } else if (normalizedType === "array" || Array.isArray(value)) {
      return <List className="w-3 h-3 text-pink-600" />;
    } else {
      return <FileJson className="w-3 h-3 text-gray-600" />;
    }
  };

  const stateTree: ExtendedStateTreeNode[] = nodes.map((node) => {
    const nodeId = node.id;
    const nodeLabel: string =
      typeof node.data?.label === "string"
        ? node.data.label
        :       typeof node.type === "string"
        ? node.type
        : nodeId;
    const nodeType: string =
      typeof node.type === "string" 
        ? node.type 
        : typeof node.data?.type === "string" 
          ? node.data.type 
          : "unknown";

    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const inputSource =
      incomingEdges.length > 0 ? incomingEdges[0].source : null;
    const execution = executions[nodeId];

    const presetOutput: any = execution?.output ?? {};

    return {
      id: nodeId,
      label: nodeLabel,
      value: {
        nodeType: nodeType,
        inputSource,
        presetOutput
      },
      nodeId,
      nodeLabel: nodeLabel,
      nodeType: nodeType,
      inputSource,
      presetOutput,
      expanded: expandedNodes.has(nodeId)
    } as ExtendedStateTreeNode;
  });

  const toggleNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, itemId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(itemId);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const renderOutputStructure = (
    output: any,
    prefix: string,
    nodeId: string,
    depth: number = 0
  ): React.ReactNode => {
    if (depth > 3) return null;

    if (output === null || output === undefined) return null;

    const nodeName = getNodeName(nodeId);

    if (typeof output === "object" && !Array.isArray(output)) {
      return Object.entries(output).map(([key, value]) => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const itemId = `${nodeId}-${fullPath}`;
        const isCopied = copiedItem === itemId;
        const templateExpression = `{{state.${nodeId}.output.${fullPath}}}`;
        const resolvedPath = `state['${nodeName}'].output.${fullPath}`;

        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          return (
            <div key={key} className="ml-3 mt-2">
              <span
                className="inline-flex flex-col items-start gap-1 px-2.5 py-2 bg-blue-50 text-blue-800 rounded-md text-xs cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(templateExpression, itemId);
                }}
              >
                <div className="flex items-center gap-2 w-full">
                  {getTypeIcon(typeof value, value)}
                  <span className="font-semibold">{key}</span>
                  {isCopied && (
                    <Check className="w-3.5 h-3.5 text-green-600 ml-auto" />
                  )}
                </div>
                <span className="font-mono text-[10px] text-blue-700">{`{{${resolvedPath}}}`}</span>
              </span>
              {renderOutputStructure(value, fullPath, nodeId, depth + 1)}
            </div>
          );
        } else {
          return (
            <span
              key={key}
              className="inline-flex flex-col items-start gap-1 px-2.5 py-2 bg-blue-50 text-blue-800 rounded-md text-xs cursor-pointer hover:bg-blue-100 transition-colors ml-3 mt-2 border border-blue-200"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(templateExpression, itemId);
              }}
            >
              <div className="flex items-center gap-2 w-full">
                {getTypeIcon(typeof value, value)}
                <span className="font-semibold">{key}</span>
                {isCopied && (
                  <Check className="w-3.5 h-3.5 text-green-600 ml-auto" />
                )}
              </div>
              <span className="font-mono text-[10px] text-blue-700">{`{{${resolvedPath}}}`}</span>
            </span>
          );
        }
      });
    }

    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Workflow State
      </h3>
      <div className="space-y-3 flex-1 overflow-y-auto pr-2">
          {stateTree.length === 0 ? (
            <p className="text-sm text-gray-500">No nodes in workflow</p>
          ) : (
            stateTree.map((entry) => {
              const inputItemId = `input-${entry.nodeId}`;
              const outputItemId = `output-${entry.nodeId}`;
              const isInputCopied = copiedItem === inputItemId;
              const isOutputCopied = copiedItem === outputItemId;

              const inputSourceName = entry.inputSource
                ? getNodeName(entry.inputSource)
                : null;
              const currentNodeName = getNodeName(entry.nodeId);

              const execution = executions[entry.nodeId];
              const status = execution?.status || 'pending';

              return (
                <div
                  key={entry.nodeId}
                  className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                >
                  <div
                    className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 cursor-pointer flex items-center justify-between transition-colors"
                    onClick={(e) => toggleNode(entry.nodeId, e)}
                  >
                    <div className="flex items-center flex-1 min-w-0 gap-2">
                      {expandedNodes.has(entry.nodeId) ? (
                        <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {entry.nodeLabel}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                            {entry.nodeType}
                          </span>
                          <span className="text-xs text-gray-500">
                            {entry.nodeId.substring(0, 8)}...
                          </span>
                          {status !== 'pending' && (
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              status === 'completed' || status === 'success' 
                                ? 'bg-green-100 text-green-700'
                                : status === 'failed' || status === 'error'
                                ? 'bg-red-100 text-red-700'
                                : status === 'running'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedNodes.has(entry.nodeId) && (
                    <div className="p-4 bg-white border-t border-gray-200 space-y-4">
                      <div>
                        <span className="text-sm text-gray-700 font-semibold mb-2 block">
                          Input:
                        </span>
                        <div className="mt-2">
                          <span
                            className="inline-flex flex-col items-start gap-1 px-3 py-2 bg-blue-50 text-blue-800 rounded-lg text-xs cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(
                                entry.inputSource
                                  ? `{{state.${entry.inputSource}.output}}`
                                  : "event.payload",
                                inputItemId
                              );
                            }}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <FileJson className="w-3.5 h-3.5 text-blue-600" />
                              <span className="font-semibold">input</span>
                              {isInputCopied && (
                                <Check className="w-3.5 h-3.5 text-green-600 ml-auto" />
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-blue-700 mt-0.5">
                              {entry.inputSource && inputSourceName
                                ? `{{state['${inputSourceName}']?.output}}`
                                : "event.payload"}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm text-gray-700 font-semibold mb-2 block">
                          Output:
                        </span>
                        <div className="mt-2 space-y-2">
                          <span
                            className="inline-flex flex-col items-start gap-1 px-3 py-2 bg-blue-50 text-blue-800 rounded-lg text-xs cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(
                                `{{state.${entry.nodeId}.output}}`,
                                outputItemId
                              );
                            }}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <FileJson className="w-3.5 h-3.5 text-blue-600" />
                              <span className="font-semibold">output</span>
                              {isOutputCopied && (
                                <Check className="w-3.5 h-3.5 text-green-600 ml-auto" />
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-blue-700 mt-0.5">{`{{state['${currentNodeName}'].output}}`}</span>
                          </span>

                          {Object.keys(entry.presetOutput).length > 0 && (
                            <div className="ml-2 mt-3 pl-4 border-l-2 border-gray-200">
                              <p className="text-xs text-gray-600 font-medium mb-2">
                                Available properties:
                              </p>
                              {renderOutputStructure(
                                entry.presetOutput,
                                "",
                                entry.nodeId
                              )}
                            </div>
                          )}

                          {Object.keys(entry.presetOutput).length === 0 && (
                            <div className="ml-2 mt-3">
                              <div className="text-xs text-gray-500 italic bg-gray-50 px-3 py-2 rounded border border-gray-200">
                                No output data available yet
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
    </div>
  );
}
