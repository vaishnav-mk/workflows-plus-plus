'use client';

import React, { useState, useRef } from 'react';
import { Code, Lightbulb, BookOpen, Copy, Check, ChevronRight } from 'lucide-react';
import { Tabs, Tab } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { useWorkflowStore } from '@/stores/workflowStore';

interface TransformNodeSettingsProps {
  nodeData: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  nodeId: string;
}

interface CodeExample {
  name: string;
  description: string;
  code: string;
  category: string;
}

const CODE_EXAMPLES: CodeExample[] = [
  {
    name: 'Return Input Data',
    description: 'Simply pass through the input data',
    code: 'return inputData;',
    category: 'Basic'
  },
  {
    name: 'Transform Object',
    description: 'Transform and reshape an object',
    code: `return {
  id: inputData.id,
  name: inputData.firstName + ' ' + inputData.lastName,
  timestamp: Date.now()
};`,
    category: 'Basic'
  },
  {
    name: 'Filter Array',
    description: 'Filter items from an array',
    code: `return inputData.filter(item => item.status === 'active');`,
    category: 'Arrays'
  },
  {
    name: 'Map Array',
    description: 'Transform each item in an array',
    code: `return inputData.map(item => ({
  ...item,
  processed: true,
  processedAt: Date.now()
}));`,
    category: 'Arrays'
  },
  {
    name: 'Calculate Sum',
    description: 'Calculate sum of numeric values',
    code: `return {
  total: inputData.reduce((sum, item) => sum + (item.value || 0), 0)
};`,
    category: 'Math'
  },
  {
    name: 'Extract Nested Data',
    description: 'Extract nested properties',
    code: `return {
  user: inputData.body?.user,
  metadata: inputData.body?.metadata
};`,
    category: 'Objects'
  },
  {
    name: 'Format Date',
    description: 'Format and transform dates',
    code: `return {
  ...inputData,
  formattedDate: new Date(inputData.timestamp).toISOString()
};`,
    category: 'Dates'
  },
  {
    name: 'Conditional Transform',
    description: 'Apply conditional logic',
    code: `if (inputData.type === 'user') {
  return { ...inputData, role: 'admin' };
}
return { ...inputData, role: 'guest' };`,
    category: 'Logic'
  }
];

export function TransformNodeSettings({ nodeData, onNodeUpdate, nodeId }: TransformNodeSettingsProps) {
  const { nodes } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<'code' | 'examples' | 'variables'>('code');
  const [copiedExample, setCopiedExample] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const currentCode = nodeData?.config?.code || 'return inputData;';
  const availableNodes = nodes.filter(n => n.id !== nodeId);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onNodeUpdate(nodeId, {
      config: {
        ...nodeData.config,
        code: e.target.value
      }
    });
  };

  const insertExample = (example: CodeExample) => {
    onNodeUpdate(nodeId, {
      config: {
        ...nodeData.config,
        code: example.code
      }
    });
    setActiveTab('code');
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const copyExample = (code: string, exampleName: string) => {
    navigator.clipboard.writeText(code);
    setCopiedExample(exampleName);
    setTimeout(() => setCopiedExample(null), 2000);
  };

  const categories = Array.from(new Set(CODE_EXAMPLES.map(e => e.category)));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          Transform Code
        </h3>
        <p className="text-sm text-gray-500">
          Write JavaScript code to transform your data. Use <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">inputData</code> to access the input.
        </p>
      </div>

      {/* Tabs */}
      <Tabs activeTab={activeTab === 'code' ? 0 : activeTab === 'examples' ? 1 : 2} onTabChange={(index) => {
        if (index === 0) setActiveTab('code');
        else if (index === 1) setActiveTab('examples');
        else setActiveTab('variables');
      }}>
        <Tab>
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            <span>Code</span>
          </div>
        </Tab>
        <Tab>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>Examples</span>
          </div>
        </Tab>
        <Tab>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            <span>Variables</span>
          </div>
        </Tab>
      </Tabs>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'code' && (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={currentCode}
                onChange={handleCodeChange}
                placeholder="return inputData;"
                className="w-full px-4 py-3 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50 focus:bg-white transition-colors resize-none"
                style={{ 
                  minHeight: '300px',
                  lineHeight: '1.6',
                  tabSize: 2
                }}
                spellCheck={false}
              />
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded font-medium">
                  JavaScript
                </span>
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">Quick Tips:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                  <li>Always use <code className="bg-blue-100 px-1 rounded">return</code> to output your result</li>
                  <li>Access input data via <code className="bg-blue-100 px-1 rounded">inputData</code> or <code className="bg-blue-100 px-1 rounded">data</code></li>
                  <li>You can use any JavaScript expression or statement</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'examples' && (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {categories.map(category => {
              const categoryExamples = CODE_EXAMPLES.filter(e => e.category === category);
              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" />
                    {category}
                  </h4>
                  <div className="space-y-2 pl-6">
                    {categoryExamples.map((example, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900">{example.name}</h5>
                            <p className="text-xs text-gray-600 mt-0.5">{example.description}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyExample(example.code, `${category}-${idx}`)}
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {copiedExample === `${category}-${idx}` ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => insertExample(example)}
                              className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Use
                            </Button>
                          </div>
                        </div>
                        <pre className="text-xs font-mono bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto">
                          <code>{example.code}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'variables' && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Available Variables</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-300 text-purple-700">
                      inputData
                    </code>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded font-medium">
                      Input
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    The input data from the previous node. This is the main variable you'll work with.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-300 text-purple-700">
                      data
                    </code>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded font-medium">
                      Alias
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    An alias for <code className="text-xs bg-gray-200 px-1 rounded">inputData</code>. Both work the same way.
                  </p>
                </div>
              </div>
            </div>

            {availableNodes.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Available Nodes</h4>
                <p className="text-xs text-gray-600 mb-2">
                  You can reference other nodes in your workflow using template syntax:
                </p>
                <div className="space-y-2">
                  {availableNodes.slice(0, 5).map(node => {
                    const nodeLabel = typeof node.data?.label === 'string' && node.data.label 
                      ? node.data.label 
                      : node.type || node.id;
                    return (
                      <div key={node.id} className="text-xs">
                        <code className="font-mono bg-white px-2 py-1 rounded border border-blue-300 text-blue-700">
                          {'{{'}state.{node.id}.output{'}}'}
                        </code>
                        <span className="ml-2 text-gray-600">{nodeLabel}</span>
                      </div>
                    );
                  })}
                  {availableNodes.length > 5 && (
                    <p className="text-xs text-gray-500 italic">
                      + {availableNodes.length - 5} more nodes available
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">JavaScript Features</h4>
              <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                <li>All standard JavaScript methods and operators</li>
                <li>Array methods: <code className="bg-amber-100 px-1 rounded">map</code>, <code className="bg-amber-100 px-1 rounded">filter</code>, <code className="bg-amber-100 px-1 rounded">reduce</code>, etc.</li>
                <li>Object methods: <code className="bg-amber-100 px-1 rounded">Object.keys</code>, <code className="bg-amber-100 px-1 rounded">Object.values</code>, etc.</li>
                <li>Date operations: <code className="bg-amber-100 px-1 rounded">Date.now()</code>, <code className="bg-amber-100 px-1 rounded">new Date()</code></li>
                <li>Math operations: <code className="bg-amber-100 px-1 rounded">Math.max</code>, <code className="bg-amber-100 px-1 rounded">Math.min</code>, etc.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

