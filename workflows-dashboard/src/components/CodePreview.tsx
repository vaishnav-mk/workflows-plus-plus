'use client';

import { useState } from 'react';
import { Copy, Download, Eye, EyeOff, Code, Check, Database, Settings } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { WorkflowDefinition } from '../types/workflow';

interface NodeUsage {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  namespace?: {
    configured: string | null;
    default: string;
    resolved: string;
    finalBinding: string;
  };
  database?: {
    configured: string | null;
    default: string;
    resolved: string;
  };
  key?: string;
  type?: string;
  valueType?: string;
  query?: string;
  returnType?: string;
  options?: any;
  parameters?: any[];
}

interface Binding {
  name: string;
  type: string;
  description: string;
  required: boolean;
  usedBy: string[];
  usage?: NodeUsage[];
  nodeCount?: number;
  nodes?: Array<{
    id: string;
    label: string;
    type: string;
  }>;
}

interface CodePreviewProps {
  workflow: WorkflowDefinition;
  isOpen: boolean;
  onClose: () => void;
  code?: string; // optional pre-generated code from backend
  bindings?: Binding[]; // optional bindings from backend
}

export function CodePreview({ workflow, isOpen, onClose, code, bindings }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [activeTab, setActiveTab] = useState<'code' | 'bindings'>('code');

  const generatedCode = code && code.trim() ? code : '// No code generated yet';

  if (!isOpen) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Code className="w-5 h-5 text-orange-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Generated Cloudflare Workers Code</h2>
              <p className="text-sm text-gray-500">TypeScript code for your workflow</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {activeTab === 'code' && (
              <>
                <button
                  onClick={() => setShowLineNumbers(!showLineNumbers)}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {showLineNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showLineNumbers ? 'Hide' : 'Show'} Line Numbers</span>
                </button>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={downloadCode}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-4">
            <button
              onClick={() => setActiveTab('code')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'code'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4" />
                <span>Code</span>
              </div>
            </button>
            {bindings && bindings.length > 0 && (
              <button
                onClick={() => setActiveTab('bindings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'bindings'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>Bindings</span>
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                    {bindings.length}
                  </span>
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'code' ? (
            <div className="h-full flex">
              {/* Code */}
              <div className="flex-1 overflow-auto">
                <SyntaxHighlighter
                  language="typescript"
                  style={oneLight}
                  showLineNumbers={showLineNumbers}
                  wrapLines={true}
                  wrapLongLines={true}
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                  }}
                  lineProps={(lineNumber) => {
                    const lines = generatedCode.split('\n');
                    const line = lines[lineNumber - 1];
                    
                    // Check if this line is part of a node block based on NODE START comments
                    if (line?.includes('// === NODE START:')) {
                      if (line.includes('ENTRY')) {
                        return { style: { backgroundColor: '#f0f9ff', borderLeft: '3px solid #0ea5e9' } };
                      }
                      if (line.includes('KV-PUT')) {
                        return { style: { backgroundColor: '#fef3c7', borderLeft: '3px solid #f59e0b' } };
                      }
                      if (line.includes('KV-GET')) {
                        return { style: { backgroundColor: '#fef3c7', borderLeft: '3px solid #f59e0b' } };
                      }
                      if (line.includes('HTTP-REQUEST')) {
                        return { style: { backgroundColor: '#f0fdf4', borderLeft: '3px solid #10b981' } };
                      }
                      if (line.includes('RETURN')) {
                        return { style: { backgroundColor: '#fdf2f8', borderLeft: '3px solid #ec4899' } };
                      }
                      if (line.includes('D1-QUERY')) {
                        return { style: { backgroundColor: '#faf5ff', borderLeft: '3px solid #8b5cf6' } };
                      }
                      if (line.includes('CONDITIONAL')) {
                        return { style: { backgroundColor: '#fffbeb', borderLeft: '3px solid #f59e0b' } };
                      }
                      if (line.includes('TRANSFORM')) {
                        return { style: { backgroundColor: '#eff6ff', borderLeft: '3px solid #3b82f6' } };
                      }
                      if (line.includes('VALIDATE')) {
                        return { style: { backgroundColor: '#fef2f2', borderLeft: '3px solid #ef4444' } };
                      }
                    }
                    
                    // Check if this line is within a node block
                    let inNodeBlock = false;
                    let nodeType = '';
                    
                    for (let i = 0; i < lineNumber - 1; i++) {
                      const prevLine = lines[i];
                      if (prevLine?.includes('// === NODE START:')) {
                        inNodeBlock = true;
                        if (prevLine.includes('ENTRY')) nodeType = 'entry';
                        else if (prevLine.includes('KV-PUT')) nodeType = 'kv-put';
                        else if (prevLine.includes('KV-GET')) nodeType = 'kv-get';
                        else if (prevLine.includes('HTTP-REQUEST')) nodeType = 'http';
                        else if (prevLine.includes('RETURN')) nodeType = 'return';
                        else if (prevLine.includes('D1-QUERY')) nodeType = 'd1';
                        else if (prevLine.includes('CONDITIONAL')) nodeType = 'conditional';
                        else if (prevLine.includes('TRANSFORM')) nodeType = 'transform';
                        else if (prevLine.includes('VALIDATE')) nodeType = 'validate';
                      } else if (prevLine?.includes('// === NODE END:') && inNodeBlock) {
                        inNodeBlock = false;
                        nodeType = '';
                      }
                    }
                    
                    if (inNodeBlock) {
                      switch (nodeType) {
                        case 'entry':
                          return { style: { backgroundColor: '#f0f9ff' } };
                        case 'kv-put':
                        case 'kv-get':
                          return { style: { backgroundColor: '#fef3c7' } };
                        case 'http':
                          return { style: { backgroundColor: '#f0fdf4' } };
                        case 'return':
                          return { style: { backgroundColor: '#fdf2f8' } };
                        case 'd1':
                          return { style: { backgroundColor: '#faf5ff' } };
                        case 'conditional':
                          return { style: { backgroundColor: '#fffbeb' } };
                        case 'transform':
                          return { style: { backgroundColor: '#eff6ff' } };
                        case 'validate':
                          return { style: { backgroundColor: '#fef2f2' } };
                      }
                    }
                    
                    return {};
                  }}
                >
                  {generatedCode}
                </SyntaxHighlighter>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-6">
                  <Database className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Required Bindings</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {bindings?.length || 0} binding{(bindings?.length || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {bindings && bindings.length > 0 ? (
                  <div className="space-y-4">
                    {bindings.map((binding, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                        {/* Binding Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold text-gray-900 text-lg">{binding.name}</h4>
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                binding.required 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {binding.required ? 'Required' : 'Optional'}
                              </span>
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                                {binding.type}
                              </span>
                              {binding.nodeCount !== undefined && (
                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                  {binding.nodeCount} node{binding.nodeCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{binding.description}</p>
                            <div className="flex flex-wrap gap-2 text-sm">
                              <span className="text-gray-500">
                                <span className="font-medium">Used by:</span> {binding.usedBy.join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Usage Details */}
                        {binding.usage && binding.usage.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                              <Database className="w-4 h-4 mr-2" />
                              Usage Details ({binding.usage.length} usage{binding.usage.length !== 1 ? 's' : ''})
                            </h5>
                            <div className="space-y-3">
                              {binding.usage.map((usage, usageIndex) => (
                                <div key={usageIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-gray-900">{usage.nodeLabel || usage.nodeType}</span>
                                      <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                                        {usage.nodeType}
                                      </span>
                                    </div>
                                    <span className="text-xs text-gray-500 font-mono">{usage.nodeId}</span>
                                  </div>

                                  {/* KV-specific details */}
                                  {usage.namespace && (
                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                      <div className="text-xs font-semibold text-yellow-900 mb-2">KV Namespace Configuration</div>
                                      <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-yellow-700">Configured:</span>
                                          <span className="font-mono text-yellow-900">
                                            {usage.namespace.configured ? (
                                              usage.namespace.configured
                                            ) : (
                                              <span className="text-gray-400">(not set)</span>
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-yellow-700">Schema Default:</span>
                                          <span className="font-mono text-yellow-900">{usage.namespace.default}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-yellow-700">Resolved:</span>
                                          <span className="font-mono text-yellow-900">{usage.namespace.resolved}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-yellow-300">
                                          <span className="font-semibold text-yellow-900">Final Binding:</span>
                                          <span className="font-mono font-bold text-yellow-900">{usage.namespace.finalBinding}</span>
                                        </div>
                                      </div>
                                      {usage.key && (
                                        <div className="mt-2 pt-2 border-t border-yellow-300">
                                          <span className="text-xs text-yellow-700">Key: </span>
                                          <span className="font-mono text-xs text-yellow-900">{usage.key}</span>
                                          {usage.type && (
                                            <span className="ml-2 text-xs text-yellow-700">
                                              (type: <span className="font-mono">{usage.type}</span>)
                                            </span>
                                          )}
                                          {usage.valueType && (
                                            <span className="ml-2 text-xs text-yellow-700">
                                              (value type: <span className="font-mono">{usage.valueType}</span>)
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {usage.options && Object.keys(usage.options).length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-yellow-300">
                                          <span className="text-xs text-yellow-700">Options: </span>
                                          <code className="text-xs bg-yellow-100 px-1 rounded">
                                            {JSON.stringify(usage.options, null, 2)}
                                          </code>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* D1-specific details */}
                                  {usage.database && (
                                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                                      <div className="text-xs font-semibold text-purple-900 mb-2">D1 Database Configuration</div>
                                      <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-purple-700">Configured:</span>
                                          <span className="font-mono text-purple-900">
                                            {usage.database.configured ? (
                                              usage.database.configured
                                            ) : (
                                              <span className="text-gray-400">(not set)</span>
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-purple-700">Schema Default:</span>
                                          <span className="font-mono text-purple-900">{usage.database.default}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-purple-300">
                                          <span className="font-semibold text-purple-900">Resolved Binding:</span>
                                          <span className="font-mono font-bold text-purple-900">{usage.database.resolved}</span>
                                        </div>
                                      </div>
                                      {usage.query && (
                                        <div className="mt-2 pt-2 border-t border-purple-300">
                                          <div className="text-xs text-purple-700 mb-1">Query:</div>
                                          <code className="text-xs bg-purple-100 px-2 py-1 rounded block font-mono">
                                            {usage.query}
                                          </code>
                                          {usage.returnType && (
                                            <div className="mt-1 text-xs text-purple-700">
                                              Return type: <span className="font-mono">{usage.returnType}</span>
                                            </div>
                                          )}
                                          {usage.parameters && usage.parameters.length > 0 && (
                                            <div className="mt-1 text-xs text-purple-700">
                                              Parameters: {usage.parameters.length}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">
              <strong>Workflow:</strong> {workflow.name} | 
              <strong> Nodes:</strong> {workflow.nodes.length} | 
              <strong> Connections:</strong> {workflow.edges.length}
            </div>
            <div className="text-sm text-gray-500">
              Generated for Cloudflare Workers with TypeScript
            </div>
          </div>
          
          {/* Node Block Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded" style={{backgroundColor: '#0ea5e9'}}></span>
              <span>Entry Node</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded" style={{backgroundColor: '#f59e0b'}}></span>
              <span>KV Node</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded" style={{backgroundColor: '#10b981'}}></span>
              <span>HTTP Request Node</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded" style={{backgroundColor: '#ec4899'}}></span>
              <span>Return Node</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded" style={{backgroundColor: '#8b5cf6'}}></span>
              <span>D1 Query Node</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded" style={{backgroundColor: '#3b82f6'}}></span>
              <span>Transform Node</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded" style={{backgroundColor: '#ef4444'}}></span>
              <span>Validate Node</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

