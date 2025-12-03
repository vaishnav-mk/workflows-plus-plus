/**
 * Reverse Codegen Service
 * Parses generated workflow code back into nodes and edges
 */

import { Effect } from "effect";
import { ErrorCode, NodeType } from "../../core/enums";

export interface ReverseCodegenResult {
  nodes: Array<{
    id: string;
    type: string;
    data?: {
      label?: string;
      config?: Record<string, unknown>;
    };
    config?: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}

export class ReverseCodegen {
  /**
   * Parse workflow code and extract nodes and edges
   */
  static parse(workflowCode: string): Effect.Effect<ReverseCodegenResult, { _tag: ErrorCode; message: string }> {
    return Effect.gen(function* (_) {
      try {
        const nodes: ReverseCodegenResult["nodes"] = [];
        const edges: ReverseCodegenResult["edges"] = [];
        const nodeMap = new Map<string, {
          id: string;
          type: string;
          name: string;
          code: string;
          stepName?: string;
        }>();

        // Extract all nodes from WF_NODE_START logs
        // Node IDs are now standardized like step_entry_0, step_transform_1, etc.
        const nodeStartRegex = /console\.log\(JSON\.stringify\(\{type:'WF_NODE_START',nodeId:'([^']+)',nodeName:([^,]+),nodeType:'([^']+)'/g;
        let match;
        const nodeOrder: string[] = [];

        while ((match = nodeStartRegex.exec(workflowCode)) !== null) {
          const nodeId = match[1]; // This will be step_entry_0, step_transform_1, etc.
          let nodeName = match[2];
          // Handle JSON.stringify output - could be "Entry" or 'Entry' or Entry
          nodeName = nodeName.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
          const nodeType = match[3];
          
          nodeMap.set(nodeId, {
            id: nodeId, // Keep the standardized step_* ID
            type: nodeType,
            name: nodeName,
            code: '',
          });
          nodeOrder.push(nodeId);
        }

        // Extract step names and code blocks for each node
        for (const nodeId of nodeOrder) {
          const nodeInfo = nodeMap.get(nodeId);
          if (!nodeInfo) continue;

          // Find the code block for this node - look for try block containing the node's start log
          const escapedNodeId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const nodeStartLogPattern = new RegExp(
            `console\\.log\\(JSON\\.stringify\\(\\{type:'WF_NODE_START',nodeId:'${escapedNodeId}'[^}]*\\}\\)\\);`
          );
          const nodeEndLogPattern = new RegExp(
            `console\\.log\\(JSON\\.stringify\\(\\{type:'WF_NODE_END',nodeId:'${escapedNodeId}'[^}]*\\}\\)\\);`
          );

          const startLogMatch = workflowCode.search(nodeStartLogPattern);
          const endLogMatch = workflowCode.search(nodeEndLogPattern);

          if (startLogMatch !== -1 && endLogMatch !== -1) {
            // Find the try block that contains the start log
            let tryStart = workflowCode.lastIndexOf('try {', startLogMatch);
            if (tryStart === -1) {
              // If no try block found, look for the code after the log statement
              tryStart = startLogMatch;
            }

            // Find the matching closing brace for the try block
            let braceCount = 0;
            let codeEnd = endLogMatch;
            let foundTryStart = false;
            
            for (let i = tryStart; i < workflowCode.length; i++) {
              if (workflowCode[i] === '{') {
                braceCount++;
                if (workflowCode.substring(i, i + 5) === 'try {') {
                  foundTryStart = true;
                }
              } else if (workflowCode[i] === '}') {
                braceCount--;
                if (braceCount === 0 && foundTryStart && i >= endLogMatch) {
                  codeEnd = i;
                  break;
                }
              }
            }

            if (tryStart !== -1 && codeEnd > tryStart) {
              const nodeCode = workflowCode.substring(tryStart, codeEnd + 1);
              nodeInfo.code = nodeCode;

              // Extract step name if it exists (for non-entry nodes)
              const stepNameMatch = nodeCode.match(/step\.do\('([^']+)'/);
              if (stepNameMatch) {
                nodeInfo.stepName = stepNameMatch[1];
              }
            } else {
              // Fallback: extract code between the two log statements
              const codeBetween = workflowCode.substring(startLogMatch, endLogMatch);
              nodeInfo.code = codeBetween;
            }
          }
        }

        // Build edges by analyzing _workflowState references
        // Skip entry node (first node) as it has no incoming edges
        for (let i = 1; i < nodeOrder.length; i++) {
          const nodeId = nodeOrder[i];
          const nodeInfo = nodeMap.get(nodeId);
          if (!nodeInfo) continue;

          const dependencies = new Set<string>();

          // Pattern 1: Direct _workflowState['node-id']?.output references
          const stateRefRegex = /_workflowState\['([^']+)'\]\?\.output/g;
          let refMatch;
          while ((refMatch = stateRefRegex.exec(nodeInfo.code)) !== null) {
            const sourceNodeId = refMatch[1];
            if (sourceNodeId !== nodeId && nodeMap.has(sourceNodeId)) {
              dependencies.add(sourceNodeId);
            }
          }

          // Pattern 2: inputData = _workflowState['node-id']?.output || event.payload
          const inputDataRegex = /inputData\s*=\s*_workflowState\['([^']+)'\]\?\.output/;
          const inputDataMatch = nodeInfo.code.match(inputDataRegex);
          if (inputDataMatch) {
            const sourceNodeId = inputDataMatch[1];
            if (sourceNodeId !== nodeId && nodeMap.has(sourceNodeId)) {
              dependencies.add(sourceNodeId);
            }
          }

          // Pattern 3: For return nodes, check the input field in _workflowState assignment
          if (nodeInfo.type === NodeType.RETURN) {
            const returnInputRegex = /input:\s*_workflowState\['([^']+)'\]\?\.output/;
            const returnInputMatch = nodeInfo.code.match(returnInputRegex);
            if (returnInputMatch) {
              const sourceNodeId = returnInputMatch[1];
              if (sourceNodeId !== nodeId && nodeMap.has(sourceNodeId)) {
                dependencies.add(sourceNodeId);
              }
            }
          }

          // Pattern 4: If no explicit dependency found but node is not entry, 
          // check if it references the previous node in order (common pattern)
          if (dependencies.size === 0 && i > 0) {
            // Check if code references any previous node
            const prevNodeId = nodeOrder[i - 1];
            if (nodeInfo.code.includes(`_workflowState['${prevNodeId}']`)) {
              dependencies.add(prevNodeId);
            }
          }

          // Create edges from dependencies
          for (const sourceId of dependencies) {
            const edgeId = `${sourceId}-${nodeId}`;
            // Avoid duplicate edges
            if (!edges.some(e => e.id === edgeId)) {
              edges.push({
                id: edgeId,
                source: sourceId,
                target: nodeId,
              });
            }
          }
        }

        // Build nodes with configs
        for (const nodeId of nodeOrder) {
          const nodeInfo = nodeMap.get(nodeId);
          if (!nodeInfo) continue;

          const config = ReverseCodegen.extractNodeConfig(nodeInfo.type, nodeInfo.code);
          
          nodes.push({
            id: nodeId,
            type: nodeInfo.type,
            data: {
              label: nodeInfo.name !== nodeInfo.type ? nodeInfo.name : undefined,
              config: config,
            },
            config: config,
          });
        }

        return { nodes, edges };
      } catch (error) {
        return yield* _(Effect.fail({
          _tag: ErrorCode.COMPILATION_ERROR,
          message: `Failed to parse workflow code: ${error instanceof Error ? error.message : String(error)}`,
        }));
      }
    });
  }

  /**
   * Extract node configuration from code based on node type
   */
  private static extractNodeConfig(
    nodeType: string,
    code: string
  ): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    switch (nodeType) {
      case NodeType.ENTRY:
        // Entry nodes: check if params are extracted
        const paramExtraction = code.match(/const\s*\{\s*([^}]+)\s*\}\s*=\s*event\.payload/);
        if (paramExtraction) {
          const paramNames = paramExtraction[1].split(',').map(p => p.trim()).filter(Boolean);
          config.params = paramNames.map(name => ({
            name,
            type: 'any',
            required: false,
          }));
        } else {
          config.params = [];
        }
        break;

      case NodeType.RETURN:
        // Return nodes: extract return value
        const returnValueMatch = code.match(/const result = ([^;]+);/);
        if (returnValueMatch) {
          const returnValue = returnValueMatch[1].trim();
          // Try to parse as JSON, otherwise treat as expression
          try {
            const parsed = JSON.parse(returnValue);
            config.returnValue = {
              type: 'static',
              value: parsed,
            };
          } catch {
            // Check if it's a state reference
            if (returnValue.includes("_workflowState")) {
              config.returnValue = {
                type: 'variable',
                value: returnValue,
              };
            } else if (returnValue === 'success') {
              config.value = 'success';
            } else {
              config.returnValue = {
                type: 'expression',
                value: returnValue,
              };
            }
          }
        }
        break;

      case NodeType.TRANSFORM:
        // Transform nodes: extract code
        const transformCodeMatch = code.match(/const result = (.+?);/s);
        if (transformCodeMatch) {
          let transformCode = transformCodeMatch[1].trim();
          // Clean up the code
          transformCode = transformCode
            .replace(/^\(\(\) => \{ /, '')
            .replace(/ \}\)\(\)$/, '')
            .replace(/^\(/, '')
            .replace(/\)$/, '');
          config.code = transformCode;
        }
        break;

      case NodeType.WORKERS_AI:
        // Workers AI nodes: extract prompt, model, temperature, etc.
        const modelMatch = code.match(/this\.env\.AI\.run\(([^,]+),/);
        if (modelMatch) {
          try {
            const model = JSON.parse(modelMatch[1]);
            config.model = model;
          } catch {
            config.model = modelMatch[1];
          }
        }

        const promptMatch = code.match(/prompt:\s*([^,}]+)/);
        if (promptMatch) {
          try {
            const prompt = JSON.parse(promptMatch[1]);
            config.prompt = prompt;
          } catch {
            config.prompt = promptMatch[1];
          }
        }

        const tempMatch = code.match(/temperature:\s*([^,}]+)/);
        if (tempMatch) {
          config.temperature = parseFloat(tempMatch[1].trim());
        }

        const maxTokensMatch = code.match(/max_tokens:\s*([^,}]+)/);
        if (maxTokensMatch) {
          config.maxTokens = parseInt(maxTokensMatch[1].trim(), 10);
        }

        const cacheTTLMatch = code.match(/expirationTtl:\s*([^}]+)/);
        if (cacheTTLMatch) {
          config.cacheTTL = parseInt(cacheTTLMatch[1].trim(), 10);
        }
        break;

      case NodeType.HTTP_REQUEST:
        // HTTP Request nodes: extract URL, method, headers, body
        const urlMatch = code.match(/url:\s*([^,}]+)/);
        if (urlMatch) {
          try {
            const url = JSON.parse(urlMatch[1].trim());
            config.url = url;
          } catch {
            config.url = urlMatch[1].trim().replace(/^["']|["']$/g, '');
          }
        }

        const methodMatch = code.match(/method:\s*['"]([^'"]+)['"]/);
        if (methodMatch) {
          config.method = methodMatch[1];
        }

        const headersMatch = code.match(/headers:\s*(\{[^}]+\})/);
        if (headersMatch) {
          try {
            config.headers = JSON.parse(headersMatch[1]);
          } catch {
            // Try to extract manually
            config.headers = {};
          }
        }

        const bodyMatch = code.match(/body:\s*([^,}]+)/);
        if (bodyMatch) {
          try {
            const body = JSON.parse(bodyMatch[1].trim());
            config.body = body;
          } catch {
            config.body = bodyMatch[1].trim();
          }
        }
        break;

      case NodeType.SLEEP:
        // Sleep nodes: extract duration
        const durationMatch = code.match(/await new Promise\(resolve => setTimeout\(resolve,\s*([^)]+)\)\)/);
        if (durationMatch) {
          const duration = parseInt(durationMatch[1].trim(), 10);
          config.duration = duration;
          config.unit = 'milliseconds';
        }
        break;

      case NodeType.KV_GET:
        // KV Get nodes: extract key and namespace
        const kvKeyMatch = code.match(/this\.env\.([^.]+)\.get\(([^)]+)\)/);
        if (kvKeyMatch) {
          config.namespace = kvKeyMatch[1];
          try {
            const key = JSON.parse(kvKeyMatch[2]);
            config.key = key;
          } catch {
            config.key = kvKeyMatch[2].replace(/^["']|["']$/g, '');
          }
        }
        break;

      case NodeType.KV_PUT:
        // KV Put nodes: extract key, value, and namespace
        const kvPutMatch = code.match(/this\.env\.([^.]+)\.put\(([^,]+),\s*([^)]+)\)/);
        if (kvPutMatch) {
          config.namespace = kvPutMatch[1];
          try {
            const key = JSON.parse(kvPutMatch[2]);
            config.key = key;
          } catch {
            config.key = kvPutMatch[2].replace(/^["']|["']$/g, '');
          }
          // Value is more complex, might need additional parsing
        }
        break;

      case NodeType.D1_QUERY:
        // D1 Query nodes: extract query and database
        const d1DbMatch = code.match(/this\.env\.([^.]+)\.prepare\(([^)]+)\)/);
        if (d1DbMatch) {
          config.database = d1DbMatch[1];
          try {
            const query = JSON.parse(d1DbMatch[2]);
            config.query = query;
          } catch {
            config.query = d1DbMatch[2].replace(/^["']|["']$/g, '');
          }
        }
        break;

      case NodeType.CONDITIONAL_INLINE:
        // Conditional nodes: extract condition
        const conditionMatch = code.match(/if\s*\(([^)]+)\)/);
        if (conditionMatch) {
          config.condition = conditionMatch[1].trim();
        }
        break;

      case NodeType.VALIDATE:
        // Validate nodes: extract schema
        const schemaMatch = code.match(/schema:\s*([^,}]+)/);
        if (schemaMatch) {
          try {
            config.schema = JSON.parse(schemaMatch[1].trim());
          } catch {
            config.schema = schemaMatch[1].trim();
          }
        }
        break;

      default:
        // For unknown node types, try to extract common patterns
        break;
    }

    return config;
  }
}

