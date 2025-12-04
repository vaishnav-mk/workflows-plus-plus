/**
 * AI Gateway Prompts
 * Templates for workflow generation
 */

import { NodeRegistry } from "../../catalog/registry";

export function buildWorkflowGenerationPrompt(
  text: string,
  includeCatalog: boolean
): string {
  const catalogContext = includeCatalog
    ? buildCatalogContext()
    : "Node catalog available on request.";

  return `You are a workflow generation assistant. Generate a Cloudflare Workflows workflow based on the following description:

${text}

Requirements:
1. The workflow must have exactly one entry node
2. The workflow must have at least one return node
3. All nodes must be connected via edges
4. Use appropriate node types for the described functionality
5. Generate realistic node configurations

${catalogContext}

Return a JSON object with this structure:
{
  "workflow": {
    "id": "generated-uuid",
    "name": "Descriptive workflow name",
    "description": "Workflow description",
    "nodes": [
      {
        "id": "node-id",
        "type": "node-type",
        "position": { "x": number, "y": number },
        "data": {
          "label": "Node label",
          "type": "node-type",
          "config": { ... }
        }
      }
    ],
    "edges": [
      {
        "id": "edge-id",
        "source": "source-node-id",
        "target": "target-node-id"
      }
    ]
  },
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of the generated workflow"
}`;
}

function buildCatalogContext(): string {
  try {
    const catalog = NodeRegistry.getCatalog();
    const nodeTypes = catalog.map((node) => node.type).join(", ");
    return `Available node types: ${nodeTypes}

Node categories:
- Control: entry, return, conditional-router, for-each, wait-event
- HTTP: http-request
- Storage: kv-get, kv-put, d1-query
- Utils: sleep, transform, validate
- AI: workers-ai, mcp-tool-input, mcp-tool-output`;
  } catch (error) {
    return "Node catalog unavailable.";
  }
}


