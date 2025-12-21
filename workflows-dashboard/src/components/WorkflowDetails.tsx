'use client';

import { Copy } from 'lucide-react';
import { useState } from 'react';

export function WorkflowDetails() {
  const [copied, setCopied] = useState(false);

  const content = `cloudflare workflows enable you to build complex, stateful applications on cloudflare's edge network. create visual workflows that automatically compile to optimized cloudflare workers.

key features

- hono framework: fast, lightweight web framework for cloudflare workers
- typescript: full type safety throughout the application
- d1 database: sqlite database for persistent storage
- kv storage: fast key-value storage for caching
- workflow management: crud operations for workflows
- node registry: built-in node types and definitions
- code generation: generate cloudflare workers code from workflows
- validation: comprehensive workflow validation
- cors support: cross-origin resource sharing enabled

node capabilities

each workflow node supports:
- playgroundcompatible: can be tested in the playground
- supportsretry: automatic retry on failure
- isasync: asynchronous execution support
- canfail: error handling and failure states

node categories

- control: entry, return, conditional-router, for-each, wait-event
- http: http-request
- storage: kv_get, kv_put
- database: d1-query
- transform: transform, validate
- timing: sleep
- ai: workers-ai, mcp-tool-input, mcp-tool-output

bindings

- kv: key-value storage
- d1: sqlite database
- r2: object storage
- ai: ai models
- service: external services
- durable_object: durable objects
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-gray-200 rounded-md bg-white">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-900">what are workflows?</h2>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          <Copy className="w-3 h-3" />
          {copied ? 'copied!' : 'copy'}
        </button>
      </div>
      <div className="p-3">
        <div className="relative">
          <pre className="bg-gray-50 border border-gray-200 text-gray-800 p-3 rounded-md overflow-x-auto font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
            <code>{content}</code>
          </pre>
          <div className="absolute top-2 right-2 flex gap-1.5">
            <span className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600 text-[10px] rounded">text</span>
          </div>
        </div>
      </div>
    </div>
  );
}
