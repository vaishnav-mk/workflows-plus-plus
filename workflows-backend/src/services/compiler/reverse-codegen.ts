import { Effect } from "effect";
import { ErrorCode, NodeType } from "../../core/enums";
import { ReverseCodegenResult } from "../../core/types";

const extractNodeConfig = (
  nodeType: string,
  code: string
): Record<string, unknown> => {
  const config: Record<string, unknown> = {};

  switch (nodeType) {
    case NodeType.ENTRY:
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
      const returnValueMatch = code.match(/const result = ([^;]+);/);
      if (returnValueMatch) {
        const returnValue = returnValueMatch[1].trim();
        try {
          const parsed = JSON.parse(returnValue);
          config.returnValue = {
            type: 'static',
            value: parsed,
          };
        } catch {
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
      const transformCodeMatch = code.match(/const result = (.+?);/s);
      if (transformCodeMatch) {
        let transformCode = transformCodeMatch[1].trim();
        transformCode = transformCode
          .replace(/^\(\(\) => \{ /, '')
          .replace(/ \}\)\(\)$/, '')
          .replace(/^\(/, '')
          .replace(/\)$/, '');
        config.code = transformCode;
      }
      break;

    case NodeType.WORKERS_AI:
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

    case NodeType.AI_SEARCH:
      const autoragMatch = code.match(/this\.env\.AI\.autorag\(([^)]+)\)\.aiSearch\(/);
      if (autoragMatch) {
        try {
          config.autoragName = JSON.parse(autoragMatch[1]);
        } catch {
          config.autoragName = autoragMatch[1];
        }
      }

      const queryMatch = code.match(/query:\s*([^,}]+)/);
      if (queryMatch) {
        try {
          config.query = JSON.parse(queryMatch[1]);
        } catch {
          config.query = queryMatch[1];
        }
      }

      const aiSearchModelMatch = code.match(/model:\s*([^,}]+)/);
      if (aiSearchModelMatch) {
        try {
          config.model = JSON.parse(aiSearchModelMatch[1]);
        } catch {
          config.model = aiSearchModelMatch[1];
        }
      }

      const systemPromptMatch = code.match(/system_prompt:\s*([^,}]+)/);
      if (systemPromptMatch) {
        try {
          config.systemPrompt = JSON.parse(systemPromptMatch[1]);
        } catch {
          config.systemPrompt = systemPromptMatch[1];
        }
      }

      const rewriteQueryMatch = code.match(/rewrite_query:\s*(true|false)/);
      if (rewriteQueryMatch) {
        config.rewriteQuery = rewriteQueryMatch[1] === 'true';
      }

      const maxNumResultsMatch = code.match(/max_num_results:\s*(\d+)/);
      if (maxNumResultsMatch) {
        config.maxNumResults = parseInt(maxNumResultsMatch[1], 10);
      }

      const scoreThresholdMatch = code.match(/score_threshold:\s*([\d.]+)/);
      if (scoreThresholdMatch) {
        config.scoreThreshold = parseFloat(scoreThresholdMatch[1]);
      }
      break;

    case NodeType.HTTP_REQUEST:
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
      const durationMatch = code.match(/await new Promise\(resolve => setTimeout\(resolve,\s*([^)]+)\)\)/);
      if (durationMatch) {
        const duration = parseInt(durationMatch[1].trim(), 10);
        config.duration = duration;
        config.unit = 'milliseconds';
      }
      break;

    case NodeType.KV_GET:
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
      const kvPutMatch = code.match(/this\.env\.([^.]+)\.put\(([^,]+),\s*([^)]+)\)/);
      if (kvPutMatch) {
        config.namespace = kvPutMatch[1];
        try {
          const key = JSON.parse(kvPutMatch[2]);
          config.key = key;
        } catch {
          config.key = kvPutMatch[2].replace(/^["']|["']$/g, '');
        }
      }
      break;

    case NodeType.D1_QUERY:
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


    default:
      break;
  }

  return config;
}

export const parseWorkflowCode = (workflowCode: string): Effect.Effect<ReverseCodegenResult, { _tag: ErrorCode; message: string }> => {
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

      const nodeStartRegex = /console\.log\((?:JSON\.stringify\()?\{type:'WF_NODE_START',nodeId:'([^']+)',nodeName:([^,]+),nodeType:'([^']+)'/g;
      let match;
      const nodeOrder: string[] = [];

      while ((match = nodeStartRegex.exec(workflowCode)) !== null) {
        const nodeId = match[1]; 
        let nodeName = match[2];
        nodeName = nodeName.replace(/^["']|["']$/g, ''); 
        const nodeType = match[3];
        
        nodeMap.set(nodeId, {
          id: nodeId, 
          type: nodeType,
          name: nodeName,
          code: '',
        });
        nodeOrder.push(nodeId);
      }

      for (const nodeId of nodeOrder) {
        const nodeInfo = nodeMap.get(nodeId);
        if (!nodeInfo) continue;

        const escapedNodeId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nodeStartLogPattern = new RegExp(
          `console\\.log\\((JSON\\.stringify\\()?\\{type:'WF_NODE_START',nodeId:'${escapedNodeId}'[^}]*\\}(\\))?\\);`
        );
        const nodeEndLogPattern = new RegExp(
          `console\\.log\\((JSON\\.stringify\\()?\\{type:'WF_NODE_END',nodeId:'${escapedNodeId}'[^}]*\\}(\\))?\\);`
        );

        const startLogMatch = workflowCode.search(nodeStartLogPattern);
        const endLogMatch = workflowCode.search(nodeEndLogPattern);

        if (startLogMatch !== -1 && endLogMatch !== -1) {
          let tryStart = workflowCode.lastIndexOf('try {', startLogMatch);
          if (tryStart === -1) {
            tryStart = startLogMatch;
          }

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

            const stepNameMatch = nodeCode.match(/step\.do\('([^']+)'/);
            if (stepNameMatch) {
              nodeInfo.stepName = stepNameMatch[1];
            }
          } else {
            const codeBetween = workflowCode.substring(startLogMatch, endLogMatch);
            nodeInfo.code = codeBetween;
          }
        }
      }

      for (let i = 1; i < nodeOrder.length; i++) {
        const nodeId = nodeOrder[i];
        const nodeInfo = nodeMap.get(nodeId);
        if (!nodeInfo) continue;

        const dependencies = new Set<string>();

        const stateRefRegex = /_workflowState\['([^']+)'\]\?\.output/g;
        let refMatch;
        while ((refMatch = stateRefRegex.exec(nodeInfo.code)) !== null) {
          const sourceNodeId = refMatch[1];
          if (sourceNodeId !== nodeId && nodeMap.has(sourceNodeId)) {
            dependencies.add(sourceNodeId);
          }
        }

        const inputDataRegex = /inputData\s*=\s*_workflowState\['([^']+)'\]\?\.output/;
        const inputDataMatch = nodeInfo.code.match(inputDataRegex);
        if (inputDataMatch) {
          const sourceNodeId = inputDataMatch[1];
          if (sourceNodeId !== nodeId && nodeMap.has(sourceNodeId)) {
            dependencies.add(sourceNodeId);
          }
        }

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

        if (dependencies.size === 0 && i > 0) {
          const prevNodeId = nodeOrder[i - 1];
          if (nodeInfo.code.includes(`_workflowState['${prevNodeId}']`)) {
            dependencies.add(prevNodeId);
          }
        }

        for (const sourceId of dependencies) {
          const edgeId = `${sourceId}-${nodeId}`;
          if (!edges.some(e => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: sourceId,
              target: nodeId,
            });
          }
        }
      }

      for (const nodeId of nodeOrder) {
        const nodeInfo = nodeMap.get(nodeId);
        if (!nodeInfo) continue;

        const config = extractNodeConfig(nodeInfo.type, nodeInfo.code);
        
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
