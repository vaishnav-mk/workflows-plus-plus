'use client';

import { useState, useMemo, useCallback } from 'react';
import { Copy, Download, Eye, EyeOff, Code, Check, Database, ChevronRight, X } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Node } from 'reactflow';
import type { Binding, CodePreviewProps, ParsedNode } from '@/types/components';
import { Badge } from '@/components/ui/Badge';
import { Tabs, Tab } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
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
      // Clipboard access denied or not available
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Code className="w-4 h-4 text-orange-500" />
            <h2 className="text-base font-semibold text-gray-900">Generated Code</h2>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'code' && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setShowLineNumbers(!showLineNumbers)}>
                  {showLineNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadCode}>
                  <Download className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="border-b border-gray-200">
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
                <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
                  <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <h3 className="text-sm font-semibold text-gray-900">Nodes ({parsedNodes.length})</h3>
                    <p className="text-xs text-gray-500 mt-1">Click to navigate to node</p>
                  </div>
                  <div className="p-2">
                    {parsedNodes.map((node) => {
                      const displayName = node.nodeName || node.nodeType || node.nodeId;
                      const isSelected = selectedNodeId === node.nodeId;
                      
                      return (
                        <button
                          key={node.nodeId}
                          onClick={() => scrollToNode(node.nodeId)}
                          className={`w-full text-left p-3 rounded-lg mb-2 transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-2 border-blue-300'
                              : 'bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                                  className="w-3 h-3 rounded-full flex-shrink-0"
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
              
              <div className="flex-1 overflow-auto">
                <div className="code-preview-container p-4 min-w-full">
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
                      lineHeight: '1.5',
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                      background: 'transparent'
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
            <div className="h-full overflow-auto p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Required Bindings</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {bindings?.length || 0} binding{(bindings?.length || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              {bindings && bindings.length > 0 ? (
                <div className="space-y-3">
                  {bindings.map((binding, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                      <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-start">
                        <div className="flex flex-col gap-1 min-w-[80px]">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Binding {index + 1}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded font-medium">
                              {binding.type}
                            </span>
                            {binding.required !== false && (
                              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-800 rounded font-medium">
                                Required
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                            Used by Nodes
                          </span>
                          {binding.usage && binding.usage.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {binding.usage.map((usage, usageIndex) => (
                                <span key={usageIndex} className="text-xs text-gray-700">
                                  <span className="font-medium">{usage.nodeLabel || usage.nodeType}</span>
                                  <span className="text-gray-400 ml-1">({usage.nodeType})</span>
                                </span>
                              ))}
                            </div>
                          ) : binding.usedBy && binding.usedBy.length > 0 ? (
                            <div className="text-xs text-gray-700">
                              {binding.usedBy.join(', ')}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 italic">No nodes specified</div>
                          )}
                        </div>

                        <div className="min-w-[200px]">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                            Binding Name
                          </span>
                          <div className="font-mono text-xs font-semibold text-gray-900 bg-gray-50 px-2 py-1.5 rounded border border-gray-200 break-all">
                            {binding.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Bindings Required</h3>
                  <p className="text-gray-500">This workflow doesn't require any Cloudflare bindings.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <strong>Workflow:</strong> {workflow.name} | 
              <strong> Nodes:</strong> {workflow.nodes.length} | 
              <strong> Connections:</strong> {workflow.edges.length}
            </div>
            <div className="text-sm text-gray-500">
              Generated for Cloudflare Workers with TypeScript
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

