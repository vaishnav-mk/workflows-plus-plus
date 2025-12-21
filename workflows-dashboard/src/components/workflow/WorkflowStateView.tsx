'use client';

import React, { useState } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useNodeExecutionStore } from '@/stores/workflow/nodeExecutionStore';
import { Card, CardContent } from '@/components';
import { ChevronRight, ChevronDown, Check, Type, Hash, ToggleLeft, Folder, List, FileJson } from 'lucide-react';
import type { StateTreeNode } from '@/types/components';

interface ExtendedStateTreeNode extends StateTreeNode {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  inputSource: string | null;
  outputPorts: Array<{ id: string; label: string; type: string; description: string }>;
  presetOutput: any;
  expanded: boolean;
}

export function WorkflowStateView() {
  const { nodes, edges } = useWorkflowStore();
  const { executions } = useNodeExecutionStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Helper to resolve node ID to node name
  const getNodeName = (nodeId: string): string => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      return typeof node.data?.label === 'string' ? node.data.label : (node.type || nodeId);
    }
    return nodeId;
  };

  // Get icon for data type
  const getTypeIcon = (type: string, value?: any): React.ReactNode => {
    const normalizedType = type.toLowerCase();
    
    if (normalizedType === 'string' || normalizedType === 'text') {
      return <Type className="w-3 h-3 text-blue-600" />;
    } else if (normalizedType === 'number' || normalizedType === 'integer') {
      return <Hash className="w-3 h-3 text-green-600" />;
    } else if (normalizedType === 'boolean') {
      return <ToggleLeft className="w-3 h-3 text-purple-600" />;
    } else if (normalizedType === 'object' || (value && typeof value === 'object' && !Array.isArray(value))) {
      return <Folder className="w-3 h-3 text-orange-600" />;
    } else if (normalizedType === 'array' || Array.isArray(value)) {
      return <List className="w-3 h-3 text-pink-600" />;
    } else {
      return <FileJson className="w-3 h-3 text-gray-600" />;
    }
  };

  // Build state structure from nodes with output ports
  const stateTree: ExtendedStateTreeNode[] = nodes.map(node => {
    const nodeId = node.id;
    const nodeLabel: string = typeof node.data?.label === 'string' ? node.data.label : (typeof node.type === 'string' ? node.type : nodeId);
    const nodeType: string = typeof node.data?.type === 'string' ? node.data.type : 'unknown';
    
    // Find incoming edges to determine input source
    const incomingEdges = edges.filter(e => e.target === nodeId);
    const inputSource = incomingEdges.length > 0 
      ? incomingEdges[0].source 
      : null;
    const execution = executions[nodeId];
    
    // Get output ports from catalog (synchronous) – kept for future use
    const outputPorts: Array<{ id: string; label: string; type: string; description: string }> = [];

    // Use actual execution output when available, otherwise fall back to an empty structure.
    // This lets us visually inspect the “current data” flowing through the workflow.
    const presetOutput: any = execution?.output ?? {};
    
    return {
      id: nodeId,
      label: nodeLabel,
      value: {
        nodeType: nodeType,
        inputSource,
        outputPorts,
        presetOutput
      },
      nodeId,
      nodeLabel: nodeLabel,
      nodeType: nodeType,
      inputSource,
      outputPorts,
      presetOutput,
      expanded: expandedNodes.has(nodeId)
    } as ExtendedStateTreeNode;
  });

  const toggleNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
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

  const renderOutputStructure = (output: any, prefix: string, nodeId: string, depth: number = 0): React.ReactNode => {
    if (depth > 3) return null; // Limit depth to avoid infinite recursion
    
    if (output === null || output === undefined) return null;
    
    const nodeName = getNodeName(nodeId);
    
    if (typeof output === 'object' && !Array.isArray(output)) {
      return Object.entries(output).map(([key, value]) => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const itemId = `${nodeId}-${fullPath}`;
        const isCopied = copiedItem === itemId;
        const templateExpression = `{{state.${nodeId}.output.${fullPath}}}`;
        const resolvedPath = `state['${nodeName}'].output.${fullPath}`;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return (
            <div key={key} className="ml-4 mt-1">
              <span
                className="inline-flex flex-col items-start gap-0.5 px-2 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(templateExpression, itemId);
                }}
              >
                <div className="flex items-center gap-1.5 w-full">
                  {getTypeIcon(typeof value, value)}
                  <span className="font-medium">{key}</span>
                  {isCopied && (
                    <Check className="w-3 h-3 text-green-600 ml-auto" />
                  )}
                </div>
                <span className="font-mono text-[10px] text-blue-700 opacity-75">{`{{${resolvedPath}}}`}</span>
              </span>
              {renderOutputStructure(value, fullPath, nodeId, depth + 1)}
            </div>
          );
        } else {
          return (
            <span
              key={key}
              className="inline-flex flex-col items-start gap-0.5 px-2 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs cursor-pointer hover:bg-blue-200 transition-colors ml-4 mt-1"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(templateExpression, itemId);
              }}
            >
              <div className="flex items-center gap-1.5 w-full">
                {getTypeIcon(typeof value, value)}
                <span className="font-medium">{key}</span>
                {isCopied && (
                  <Check className="w-3 h-3 text-green-600 ml-auto" />
                )}
              </div>
              <span className="font-mono text-[10px] text-blue-700 opacity-75">{`{{${resolvedPath}}}`}</span>
            </span>
          );
        }
      });
    }
    
    return null;
  };

  return (
    <Card className="w-full mb-4">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Workflow State</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {stateTree.length === 0 ? (
            <p className="text-xs text-gray-500">No nodes in workflow</p>
          ) : (
            stateTree.map((entry) => {
              const inputItemId = `input-${entry.nodeId}`;
              const outputItemId = `output-${entry.nodeId}`;
              const isInputCopied = copiedItem === inputItemId;
              const isOutputCopied = copiedItem === outputItemId;
              
              // Get node names for display
              const inputSourceName = entry.inputSource ? getNodeName(entry.inputSource) : null;
              const currentNodeName = getNodeName(entry.nodeId);
              
              return (
                <div
                  key={entry.nodeId}
                  className="border border-gray-200 rounded"
                >
                  {/* Node Header */}
                  <div
                    className="p-2 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                    onClick={(e) => toggleNode(entry.nodeId, e)}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      {expandedNodes.has(entry.nodeId) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 mr-1 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 mr-1 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {entry.nodeLabel}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {entry.nodeType} ({entry.nodeId.substring(0, 8)}...)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedNodes.has(entry.nodeId) && (
                    <div className="p-2 bg-white border-t border-gray-200 space-y-2">
                      {/* Input Source */}
                      <div className="text-xs">
                        <span className="text-gray-600 font-medium">Input:</span>
                        <div className="mt-1">
                          <span
                            className="inline-flex flex-col items-start gap-0.5 px-2 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(
                                entry.inputSource 
                                  ? `{{state.${entry.inputSource}.output}}`
                                  : 'event.payload',
                                inputItemId
                              );
                            }}
                          >
                            <div className="flex items-center gap-1.5 w-full">
                              <FileJson className="w-3 h-3 text-gray-600" />
                              <span className="font-medium">input</span>
                              {isInputCopied && (
                                <Check className="w-3 h-3 text-green-600 ml-auto" />
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-blue-700 opacity-75">
                              {entry.inputSource && inputSourceName
                                ? `{{state['${inputSourceName}']?.output}}`
                                : 'event.payload'}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Output Properties */}
                      <div className="text-xs">
                        <span className="text-gray-600 font-medium">Output:</span>
                        <div className="mt-1 space-y-1">
                          {/* Main output */}
                          <span
                            className="inline-flex flex-col items-start gap-0.5 px-2 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(`{{state.${entry.nodeId}.output}}`, outputItemId);
                            }}
                          >
                            <div className="flex items-center gap-1.5 w-full">
                              <FileJson className="w-3 h-3 text-gray-600" />
                              <span className="font-medium">output</span>
                              {isOutputCopied && (
                                <Check className="w-3 h-3 text-green-600 ml-auto" />
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-blue-700 opacity-75">{`{{state['${currentNodeName}'].output}}`}</span>
                          </span>
                          
                          {/* Preset output structure */}
                          {Object.keys(entry.presetOutput).length > 0 && (
                            <div className="ml-4 mt-2">
                              <p className="text-xs text-gray-500 mb-1">Available properties:</p>
                              {renderOutputStructure(entry.presetOutput, '', entry.nodeId)}
                            </div>
                          )}
                          
                          {/* Output ports (fallback if no preset) */}
                          {Object.keys(entry.presetOutput).length === 0 && entry.outputPorts.length > 0 && (
                            <div className="ml-4 mt-2 space-y-1">
                              {entry.outputPorts.map((port) => {
                                const portItemId = `port-${entry.nodeId}-${port.id}`;
                                const isPortCopied = copiedItem === portItemId;
                                const templateExpression = `{{state.${entry.nodeId}.output.${port.id}}}`;
                                const resolvedPath = `state['${currentNodeName}'].output.${port.id}`;
                                return (
                                  <span
                                    key={port.id}
                                    className="inline-flex flex-col items-start gap-0.5 px-2 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(templateExpression, portItemId);
                                    }}
                                  >
                                    <div className="flex items-center gap-1.5 w-full">
                                      {getTypeIcon(port.type)}
                                      <span className="font-medium">{port.id}</span>
                                      {isPortCopied && (
                                        <Check className="w-3 h-3 text-green-600 ml-auto" />
                                      )}
                                    </div>
                                    <span className="font-mono text-[10px] text-blue-700 opacity-75">{`{{${resolvedPath}}}`}</span>
                                  </span>
                                );
                              })}
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
      </CardContent>
    </Card>
  );
}
