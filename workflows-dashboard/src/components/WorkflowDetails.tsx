"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

export function WorkflowDetails() {
  const [copied, setCopied] = useState(false);

  const content = `build deploy and manage cloudflare workflows with a visual drag-and-drop interface.

workflow builder

- drag-and-drop visual editor with react flow
- real-time validation and error detection
- insert nodes between edges dynamically
- live code preview of generated workers code
- template expressions for node-to-node data flow
- graph analysis with topological sorting
- local workflow persistence

ai workflow generation

- generate workflows from text descriptions
- generate workflows from uploaded images
- paste images directly into the generator
- ai detects missing fields and prompts for completion
- automatic node and edge structure generation

workflow compilation

- compile visual workflows to typescript workers code
- automatic binding detection for cloudflare resources
- template resolution with node state references
- reverse codegen to import existing workflow code
- compilation preview before deployment
- binding validation against available resources

deployment system

- one-click deployment to cloudflare workers
- real-time progress tracking with server-sent events
- animated deployment pipeline visualization
- durable objects for reliable deployment state
- automatic worker creation and versioning
- mcp protocol support for ai workflows
- deployment timeline with detailed progress

workflow management

- browse deployed workflows with pagination
- monitor workflow instances in real-time
- log tailing with session management
- instance execution details and status tracking

cloudflare resources

- d1 database management with sql query execution
- r2 bucket management and object browsing
- kv namespace management with key listing
- worker version history and inspection
- query validation and schema inspection
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-gray-200 rounded-md bg-white">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-900">
          what are workflows?
        </h2>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          <Copy className="w-3 h-3" />
          {copied ? "copied!" : "copy"}
        </button>
      </div>
      <div className="p-3">
        <div className="relative">
          <pre className="bg-gray-50 border border-gray-200 text-gray-800 p-3 rounded-md overflow-x-auto font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
            <code>{content}</code>
          </pre>
          <div className="absolute top-2 right-2 flex gap-1.5">
            <span className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600 text-[10px] rounded">
              text
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
