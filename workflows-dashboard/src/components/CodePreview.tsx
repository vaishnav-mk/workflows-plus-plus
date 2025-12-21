'use client';

import { useState, useMemo, useCallback } from 'react';
import { Copy, Download, Eye, EyeOff, Code, Check, Database, ChevronRight, X } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { CodePreviewProps, ParsedNode } from '@/types/components';
import { Badge } from '@/components/ui/Badge';
import { Tabs, Tab } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components';
import { useNodeRegistry } from '@/hooks/useNodeRegistry';

const DEFAULT_COLOR = '#6b7280';
const NO_CODE_MESSAGE = '// No code generated yet';

const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex || !hex.startsWith('#')) {
    return `rgba(107, 114, 128, ${alpha})`;
  }
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return `rgba(107, 114, 128, ${alpha})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(107, 114, 128, ${alpha})`;
  }
};

export function CodePreview({ workflow, isOpen, onClose, code, bindings, nodes = [], onNodeSelect }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [activeTab, setActiveTab] = useState<'code' | 'bindings'>('code');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { catalog } = useNodeRegistry();

  const generatedCode = code && code.trim() ? code : NO_CODE_MESSAGE;

  const getNodeColor = useCallback((nodeType: string, nodeId: string): string => {
    const catalogItem = catalog.find(item => item.type === nodeType);
    const workflowNode = nodes.find(n => n.id === nodeId);
    const nodeData = workflowNode?.data as any;
    return catalogItem?.color || nodeData?.color || DEFAULT_COLOR;
  }, [catalog, nodes]);

  const parsedNodes = useMemo((): ParsedNode[] => {
    if (!generatedCode || generatedCode === NO_CODE_MESSAGE) return [];
    
    const lines = generatedCode.split('\n');
    const parsedNodesList: ParsedNode[] = [];
    const nodeStack: { nodeId: string; nodeName: string; nodeType: string; startLine: number }[] = [];
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      const nodeStartMatch = line.match(/console\.log\(JSON\.stringify\(\{type:'WF_NODE_START',nodeId:'([^']+)',nodeName:([^,]+),nodeType:'([^']+)'/);
      if (nodeStartMatch) {
        const [, nodeId, nodeName, nodeType] = nodeStartMatch;
        nodeStack.push({ 
          nodeId, 
          nodeName: nodeName.replace(/^["']|["']$/g, ''), 
          nodeType, 
          startLine: lineNumber 
        });
      }
      
      const nodeEndMatch = line.match(/console\.log\(JSON\.stringify\(\{type:'WF_NODE_(END|ERROR)',nodeId:'([^']+)'/);
      if (nodeEndMatch && nodeStack.length > 0) {
        const topNode = nodeStack.pop();
        if (topNode) {
          parsedNodesList.push({
            ...topNode,
            endLine: lineNumber,
            color: getNodeColor(topNode.nodeType, topNode.nodeId),
          });
        }
      }
    });
    
    nodeStack.forEach((topNode) => {
      parsedNodesList.push({
        ...topNode,
        endLine: lines.length,
        color: getNodeColor(topNode.nodeType, topNode.nodeId),
      });
    });
    
    return parsedNodesList;
  }, [generatedCode, getNodeColor]);

  const getNodeForLine = useCallback((lineNumber: number): ParsedNode | null => {
    return parsedNodes.find(node => lineNumber >= node.startLine && lineNumber <= node.endLine) || null;
  }, [parsedNodes]);

  const handleLineClick = useCallback((lineNumber: number) => {
    const node = getNodeForLine(lineNumber);
    if (node && onNodeSelect) {
      setSelectedNodeId(node.nodeId);
      onNodeSelect(node.nodeId);
      setTimeout(() => onClose(), 300);
    }
  }, [getNodeForLine, onNodeSelect, onClose]);

  const scrollToNode = useCallback((nodeId: string) => {
    const node = parsedNodes.find(n => n.nodeId === nodeId);
    if (node) {
      const codeElement = document.querySelector('.code-preview-container');
      const lineElement = codeElement?.querySelector(`[data-line-number="${node.startLine}"]`);
      if (lineElement) {
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setSelectedNodeId(nodeId);
      }
    }
  }, [parsedNodes]);

  if (!isOpen) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.toLowerCase().replace(/\s+/g, '-')}-workflow.ts`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col border border-gray-200/50">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm rounded-t-xl">
          <div className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Generated Code</h2>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'code' && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setShowLineNumbers(!showLineNumbers)} className="hover:bg-gray-100">
                  {showLineNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={copyToClipboard} className="hover:bg-gray-100">
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadCode} className="hover:bg-gray-100">
                  <Download className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="border-b border-gray-200 bg-white/90 backdrop-blur-sm">
          <Tabs activeTab={activeTab === 'code' ? 0 : 1} onTabChange={(idx) => setActiveTab(idx === 0 ? 'code' : 'bindings')}>
            <Tab>
              <div className="flex items-center gap-1.5">
                <Code className="w-4 h-4" />
                <span>Code</span>
              </div>
            </Tab>
            {bindings && bindings.length > 0 && (
              <Tab>
                <div className="flex items-center gap-1.5">
                  <Database className="w-4 h-4" />
                  <span>Bindings</span>
                  <Badge variant="default" className="ml-0.5">{bindings.length}</Badge>
                </div>
              </Tab>
            )}
          </Tabs>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'code' ? (
            <div className="h-full flex">
              {parsedNodes.length > 0 && (
                <div className="w-64 border-r border-gray-200 bg-gray-50/80 backdrop-blur-sm overflow-y-auto">
                  <div className="p-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
                    <h3 className="text-sm font-semibold text-gray-900">Nodes ({parsedNodes.length})</h3>
                    <p className="text-xs text-gray-500 mt-1">Click to navigate to node</p>
                  </div>
                  <div className="p-3">
                    {parsedNodes.map((node) => {
                      const displayName = node.nodeName || node.nodeType || node.nodeId;
                      const isSelected = selectedNodeId === node.nodeId;
                      
                      return (
                        <button
                          key={node.nodeId}
                          onClick={() => scrollToNode(node.nodeId)}
                          className={`w-full text-left p-3 rounded-lg mb-2 transition-all ${
                            isSelected
                              ? 'bg-orange-50 border-2 border-orange-300 shadow-sm'
                              : 'bg-white border border-gray-200 hover:border-orange-200 hover:bg-orange-50/50'
                          }`}
                          style={{
                            borderLeftWidth: '4px',
                            borderLeftColor: node.color || '#6b7280',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                  style={{ backgroundColor: node.color || '#6b7280' }}
                                />
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {displayName}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 ml-5">
                                Lines {node.startLine}-{node.endLine}
                              </div>
                              <div className="text-xs text-gray-400 ml-5 mt-0.5 truncate">
                                {node.nodeType}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="flex-1 overflow-auto bg-gray-50/30">
                <div className="code-preview-container p-6 min-w-full">
                  <SyntaxHighlighter
                    language="typescript"
                    style={oneLight}
                    showLineNumbers={showLineNumbers}
                    wrapLines={true}
                    wrapLongLines={true}
                    customStyle={{
                      margin: 0,
                      padding: 0,
                      fontSize: '0.875rem',
                      lineHeight: '1.6',
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                      background: 'transparent',
                      borderRadius: '0.5rem'
                    }}
                  lineProps={(lineNumber) => {
                    const node = getNodeForLine(lineNumber);
                    if (!node) {
                      return { 'data-line-number': lineNumber };
                    }

                    const isSelected = selectedNodeId === node.nodeId;
                    const nodeColor = node.color || DEFAULT_COLOR;
                    const bgColor = isSelected 
                      ? hexToRgba(nodeColor, 0.3)
                      : hexToRgba(nodeColor, 0.1);

                    return {
                      'data-line-number': lineNumber,
                      className: 'code-line',
                      style: {
                        backgroundColor: bgColor,
                        borderLeft: lineNumber === node.startLine ? `3px solid ${nodeColor}` : undefined,
                        cursor: onNodeSelect ? 'pointer' : 'default',
                        transition: 'background-color 0.2s',
                      },
                      onClick: () => handleLineClick(lineNumber),
                      onMouseEnter: (e: React.MouseEvent) => {
                        if (onNodeSelect) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = hexToRgba(nodeColor, 0.2);
                        }
                      },
                      onMouseLeave: (e: React.MouseEvent) => {
                        if (onNodeSelect) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = bgColor;
                        }
                      },
                    };
                  }}
                  >
                    {generatedCode}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto p-4">
              <div className="max-w-4xl mx-auto">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-orange-600" />
                    <h3 className="text-base font-semibold text-gray-900">Required Bindings</h3>
                    {bindings && bindings.length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded font-medium">
                        {bindings.length}
                      </span>
                    )}
                  </div>
                </div>
                
                {bindings && bindings.length > 0 ? (
                  <div className="space-y-2">
                    {bindings.map((binding, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-md bg-white hover:border-orange-300 hover:bg-orange-50/20 transition-all p-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded bg-orange-100 flex-shrink-0 mt-0.5">
                            <Database className="w-3.5 h-3.5 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-semibold text-gray-900">
                                {binding.type}
                              </span>
                              {binding.required !== false && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded font-medium">
                                  Required
                                </span>
                              )}
                            </div>
                            <div className="mb-2">
                              <div className="font-mono text-xs font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200 break-all">
                                {binding.name}
                              </div>
                            </div>
                            {(binding.usage && binding.usage.length > 0) || (binding.usedBy && binding.usedBy.length > 0) ? (
                              <div className="flex flex-wrap gap-1.5">
                                {binding.usage && binding.usage.length > 0 ? (
                                  binding.usage.map((usage, usageIndex) => (
                                    <span 
                                      key={usageIndex} 
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded border border-gray-200"
                                    >
                                      <span className="font-medium">{usage.nodeLabel || usage.nodeType}</span>
                                      <span className="text-gray-400">({usage.nodeType})</span>
                                    </span>
                                  ))
                                ) : (
                                  binding.usedBy?.map((nodeName, idx) => (
                                    <span 
                                      key={idx}
                                      className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded border border-gray-200"
                                    >
                                      {nodeName}
                                    </span>
                                  ))
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-md bg-gray-50/50 p-8 text-center">
                    <Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No bindings required</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-3 bg-white/90 backdrop-blur-sm rounded-b-xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Workflow:</span>
                <span className="font-medium text-gray-900">{workflow.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Nodes:</span>
                <span className="font-medium text-gray-900 bg-orange-50 px-1.5 py-0.5 rounded">{workflow.nodes.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Connections:</span>
                <span className="font-medium text-gray-900 bg-orange-50 px-1.5 py-0.5 rounded">{workflow.edges.length}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Cloudflare Workers • TypeScript
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

