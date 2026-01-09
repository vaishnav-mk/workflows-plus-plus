import { Effect } from "effect";
import { WorkflowNodeDefinition, GraphContext, CodeGenContext, CodeGenResult, CompilationResult, CompilationOptions, Workflow, BindingConfiguration } from "../../core/types";
import { CompilationStatus, ErrorCode, NodeType, BindingType } from "../../core/enums";
import { GraphAnalyzer } from "./graph-analyzer";
import { WorkflowValidator } from "./workflow-validator";
import { aggregateBindings, generateWranglerBindings } from "./binding-analyzer";
import { CODE_GENERATION } from "../../core/constants";
import { generateClassName, generateWorkflowId } from "../../core/utils/id-generator";
import * as NodeLibrary from "../../library";
import { logger } from "../../core/logging/logger";

export class WorkflowCompiler {
  static compile(
    workflow: Workflow,
    options?: CompilationOptions
  ): Effect.Effect<CompilationResult, { _tag: ErrorCode; message: string }> {
    return Effect.gen(function* (_) {
      const compileStart = Date.now();
      logger.info("Starting workflow compilation", {
        workflowName: workflow.name,
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length,
        options: options ? { workflowId: options.workflowId, className: options.className } : undefined
      });

      const validateStart = Date.now();
      logger.debug("Validating workflow structure");
      yield* _(WorkflowValidator.validateWorkflow(workflow.nodes, workflow.edges));
      logger.logPerformance("workflow_validation", Date.now() - validateStart, {
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length
      });
      
      const graphStart = Date.now();
      logger.debug("Building graph context");
      const graphContext = yield* _(GraphAnalyzer.buildGraphContext(workflow.nodes, workflow.edges));
      logger.logPerformance("graph_analysis", Date.now() - graphStart, {
        topoOrderLength: graphContext.topoOrder.length,
        nodeCount: graphContext.nodes.length
      });
      logger.debug("Graph context built", {
        topoOrder: graphContext.topoOrder,
        nodeCount: graphContext.nodes.length
      });
      
      const codegenStart = Date.now();
      logger.info("Starting code generation for nodes", {
        nodeCount: graphContext.topoOrder.length
      });
      const codegenResults = yield* _(
        WorkflowCompiler.generateCodeForNodes(workflow.nodes, graphContext)
      );
      logger.logPerformance("codegen_nodes", Date.now() - codegenStart, {
        nodesGenerated: codegenResults.length
      });
      logger.info("Code generation completed", {
        nodesGenerated: codegenResults.length,
        nodeTypes: codegenResults
          .filter(r => r && r.nodeType)
          .map(r => r.nodeType)
      });
      
      const workflowId = options?.workflowId || generateWorkflowId();
      logger.debug("Workflow ID generated", { workflowId });
      
      const bindingsStart = Date.now();
      const bindings = aggregateBindings(codegenResults, workflowId);
      logger.logPerformance("binding_analysis", Date.now() - bindingsStart, {
        bindingCount: bindings.length,
        bindings: bindings.filter(b => b && b.name && b.type).map(b => ({ name: b.name, type: b.type }))
      });
      logger.info("Bindings analyzed", {
        bindingCount: bindings.length,
        bindings: bindings.filter(b => b && b.name && b.type).map(b => ({ name: b.name, type: b.type }))
      });
      
      const workerCodeStart = Date.now();
      logger.debug("Generating worker TypeScript code");
      const tsCode = yield* _(
        WorkflowCompiler.generateWorkerCode(workflow, codegenResults, options, workflowId)
      );
      logger.logPerformance("worker_code_generation", Date.now() - workerCodeStart, {
        codeLength: tsCode.length
      });
      logger.debug("Worker code generated", {
        codeLength: tsCode.length,
        lineCount: tsCode.split("\n").length
      });
      
      const className = options?.className || generateClassName(workflowId);
      logger.debug("Class name generated", { className });

      const configStart = Date.now();
      logger.debug("Generating wrangler configuration");
      const wranglerConfig = yield* _(
        WorkflowCompiler.generateWranglerConfig(workflow, bindings, options, workflowId, className)
      );
      logger.logPerformance("wrangler_config_generation", Date.now() - configStart);

      const totalDuration = Date.now() - compileStart;
      logger.logPerformance("workflow_compilation", totalDuration, {
        workflowName: workflow.name,
        workflowId,
        className,
        nodeCount: workflow.nodes.length,
        bindingCount: bindings.length
      });
      logger.info("Workflow compilation completed successfully", {
        workflowName: workflow.name,
        workflowId,
        className,
        totalDuration
      });

      return {
        tsCode,
        wranglerConfig,
        bindings,
        className,
        status: CompilationStatus.SUCCESS,
        errors: [],
        warnings: [],
      };
    });
  }

  private static generateCodeForNodes(
    nodes: Array<{ id: string; type: string; data?: Record<string, unknown>; config?: Record<string, unknown> }>,
    graphContext: GraphContext
  ): Effect.Effect<
    Array<{
      nodeId: string;
      nodeLabel: string;
      nodeType: string;
      result: CodeGenResult;
      branchCondition?: string;
      branchReason?: string;
    }>,
    { _tag: ErrorCode; message: string }
  > {
    return Effect.gen(function* (_) {
      const results: Array<{
        nodeId: string;
        nodeLabel: string;
        nodeType: string;
        result: CodeGenResult;
        branchCondition?: string;
        branchReason?: string;
      }> = [];
      
      logger.debug("Starting code generation for nodes", {
        totalNodes: graphContext.topoOrder.length,
        topoOrder: graphContext.topoOrder
      });
      
      for (let i = 0; i < graphContext.topoOrder.length; i++) {
        const nodeId = graphContext.topoOrder[i];
        const nodeStart = Date.now();
        
        const node = nodes.find(n => n.id === nodeId);
        if (!node) {
          logger.error("Node not found during codegen", undefined, { nodeId });
          return yield* _(Effect.fail({
            _tag: ErrorCode.NODE_NOT_FOUND,
            message: `Node not found: ${nodeId}`,
          }));
        }

        if (!node.type) {
          logger.error("Node missing type property", undefined, { nodeId, node });
          return yield* _(Effect.fail({
            _tag: ErrorCode.NODE_NOT_FOUND,
            message: `Node missing type property: ${nodeId}`,
          }));
        }

        const nodeDef = WorkflowCompiler.getNodeDefinition(node.type);
        if (!nodeDef) {
          logger.error("Node definition not found", undefined, { nodeId, nodeType: node.type });
          return yield* _(Effect.fail({
            _tag: ErrorCode.NODE_NOT_FOUND,
            message: `Node definition not found: ${node.type}`,
          }));
        }

        const config = (node.config || node.data?.config || {}) as Record<string, unknown>;
        const nodeLabel = (node.data?.label as string | undefined) || node.type || "";
        const stepName = nodeId;
        const prevStepId = graphContext.edges
          .filter(e => e.target === nodeId)
          .map(e => e.source)[0] || "";

        logger.debug("Generating code for node", {
          nodeId,
          nodeType: node.type,
          nodeLabel,
          stepName,
          prevStepId,
          position: `${i + 1}/${graphContext.topoOrder.length}`,
          configKeys: Object.keys(config)
        });

        const codegenContext: CodeGenContext = {
          nodeId,
          config,
          stepName,
          prevStepId,
          graphContext,
        };

        const codegenStart = Date.now();
        let result: CodeGenResult;
        try {
          result = yield* _(nodeDef.codegen(codegenContext));
        } catch (error) {
          logger.error("Codegen failed", error instanceof Error ? error : new Error(String(error)), { 
            nodeId, 
            nodeType: node.type,
            nodeLabel 
          });
          return yield* _(Effect.fail({
            _tag: ErrorCode.COMPILATION_ERROR,
            message: `Codegen failed for node ${nodeId}: ${error instanceof Error ? error.message : String(error)}`,
          }));
        }
        const codegenDuration = Date.now() - codegenStart;
        
        if (!result || typeof result !== 'object') {
          logger.error("Invalid codegen result", undefined, { nodeId, nodeType: node.type, result });
          return yield* _(Effect.fail({
            _tag: ErrorCode.COMPILATION_ERROR,
            message: `Invalid codegen result for node ${nodeId}`,
          }));
        }
        
        if (!result.code || typeof result.code !== 'string') {
          logger.error("Codegen result missing code", undefined, { nodeId, nodeType: node.type, result });
          return yield* _(Effect.fail({
            _tag: ErrorCode.COMPILATION_ERROR,
            message: `Codegen result missing code for node ${nodeId}`,
          }));
        }
        
        const validBindings = (result.requiredBindings || [])
          .filter(b => b && typeof b === 'object' && b.name && b.type);
        
        logger.logPerformance(`codegen_${node.type}`, codegenDuration, {
          nodeId,
          nodeType: node.type,
          nodeLabel,
          codeLength: result.code.length,
          bindingCount: result.requiredBindings?.length || 0
        });
        
        logger.debug("Code generated for node", {
          nodeId,
          nodeType: node.type,
          nodeLabel,
          codeLength: result.code.length,
          bindings: validBindings.map(b => ({ name: b.name, type: b.type }))
        });

        let branchCondition: string | undefined;
        let branchReason: string | undefined;

        const incomingEdges = graphContext.edges.filter(e => e.target === nodeId);
        const conditionalIncoming = incomingEdges
          .map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            return { edge, sourceNode };
          })
          .filter(
            (entry): entry is { edge: GraphContext["edges"][number]; sourceNode: { id: string; type: string } } =>
              Boolean(entry.sourceNode && entry.sourceNode.type === NodeType.CONDITIONAL_ROUTER && entry.edge.sourceHandle)
          );

        if (conditionalIncoming.length > 0) {
          const { edge, sourceNode } = conditionalIncoming[0];
          const routeKey = edge.sourceHandle || "true";
          const sanitizedRouterStepName = sourceNode.id.replace(/[^a-zA-Z0-9_]/g, "_");

          branchCondition = `(_workflowResults.${sanitizedRouterStepName}?.['${routeKey}'] === true)`;
          branchReason = `route_${routeKey}_not_taken`;
        }

        results.push({
          nodeId,
          nodeLabel,
          nodeType: node.type,
          result: {
            code: result.code,
            requiredBindings: validBindings
          },
          branchCondition,
          branchReason,
        });

        const nodeDuration = Date.now() - nodeStart;
        logger.debug("Node codegen completed", {
          nodeId,
          nodeType: node.type,
          duration: nodeDuration
        });
      }

      logger.info("All nodes code generation completed", {
        totalNodes: results.length,
        nodeIds: results.map(r => r.nodeId)
      });

      return results;
    });
  }

  private static getNodeDefinition(nodeType: string): WorkflowNodeDefinition<unknown> | null {
    const nodeTypeMap: Record<string, WorkflowNodeDefinition<unknown>> = {
      [NodeType.ENTRY]: NodeLibrary.EntryNode as WorkflowNodeDefinition<unknown>,
      [NodeType.RETURN]: NodeLibrary.ReturnNode as WorkflowNodeDefinition<unknown>,
      [NodeType.SLEEP]: NodeLibrary.SleepNode as WorkflowNodeDefinition<unknown>,
      [NodeType.KV_GET]: NodeLibrary.KVGetNode as WorkflowNodeDefinition<unknown>,
      [NodeType.KV_PUT]: NodeLibrary.KVPutNode as WorkflowNodeDefinition<unknown>,
      [NodeType.R2_GET]: NodeLibrary.R2GetNode as WorkflowNodeDefinition<unknown>,
      [NodeType.R2_PUT]: NodeLibrary.R2PutNode as WorkflowNodeDefinition<unknown>,
      [NodeType.D1_QUERY]: NodeLibrary.D1QueryNode as WorkflowNodeDefinition<unknown>,
      [NodeType.HTTP_REQUEST]: NodeLibrary.HttpRequestNode as WorkflowNodeDefinition<unknown>,
      [NodeType.TRANSFORM]: NodeLibrary.TransformNode as WorkflowNodeDefinition<unknown>,
      [NodeType.CONDITIONAL_ROUTER]: NodeLibrary.ConditionalRouterNode as WorkflowNodeDefinition<unknown>,
      [NodeType.WAIT_EVENT]: NodeLibrary.WaitEventNode as WorkflowNodeDefinition<unknown>,
      [NodeType.WORKERS_AI]: NodeLibrary.WorkersAINode as WorkflowNodeDefinition<unknown>,
      [NodeType.AI_SEARCH]: NodeLibrary.AISearchNode as WorkflowNodeDefinition<unknown>,
      [NodeType.MCP_TOOL_INPUT]: NodeLibrary.MCPToolInputNode as WorkflowNodeDefinition<unknown>,
      [NodeType.MCP_TOOL_OUTPUT]: NodeLibrary.MCPToolOutputNode as WorkflowNodeDefinition<unknown>,
    };
    return nodeTypeMap[nodeType] || null;
  }

  private static generateWorkerCode(
    workflow: { name: string; nodes: Array<{ id: string; type: string; data?: Record<string, unknown> }> },
    codegenResults: Array<{
      nodeId: string;
      nodeLabel: string;
      nodeType: string;
      result: CodeGenResult;
      branchCondition?: string;
      branchReason?: string;
    }>,
    options?: CompilationOptions,
    workflowId?: string
  ): Effect.Effect<string, { _tag: ErrorCode; message: string }> {
    return Effect.gen(function* (_) {
      const workerCodeStart = Date.now();
      logger.debug("Generating worker TypeScript code", {
        workflowName: workflow.name,
        workflowId,
        nodeCount: codegenResults.length
      });

      const className = options?.className || 
        CODE_GENERATION.CLASS_NAME_PATTERN(workflow.name);

      const finalClassName = options?.className || (workflowId ? generateClassName(workflowId) : className);
      
      const hasMCPNodes = workflow.nodes.some(n => n.type === "mcp-tool-input" || n.type === "mcp-tool-output");
      const mcpInputNode = workflow.nodes.find(n => n.type === "mcp-tool-input");
      const mcpConfig = (mcpInputNode?.data?.config || {}) as Record<string, unknown>;
      
      const mcpClassName = `${finalClassName}MCP`;
      const serverName = mcpClassName; 
      const toolName = (mcpConfig.toolName as string) || `${finalClassName}MCPToolMain`;
      
      let toolParameters: Array<{ name: string; type: string; required?: boolean; description?: string }> = [];
      if (mcpConfig.parameters) {
        if (typeof mcpConfig.parameters === 'string') {
          try {
            const parsed = JSON.parse(mcpConfig.parameters);
            if (Array.isArray(parsed)) {
              toolParameters = parsed;
            } else if (typeof parsed === 'object') {
              toolParameters = Object.entries(parsed).map(([name, type]) => ({
                name,
                type: String(type),
                required: true
              }));
            }
          } catch (e) {
            console.error('Failed to parse parameters:', e);
          }
        } else if (Array.isArray(mcpConfig.parameters)) {
          toolParameters = mcpConfig.parameters;
        }
      }
      
      const zodSchemaFields: string[] = [];
      toolParameters.forEach(param => {
        let zodType = "z.string()";
        if (param.type === "number") zodType = "z.number()";
        else if (param.type === "boolean") zodType = "z.boolean()";
        else if (param.type === "array") zodType = "z.array(z.any())";
        else if (param.type === "object") zodType = "z.object({})";
        
        if (!param.required) {
          zodType += ".optional()";
        }
        
        if (param.description) {
          zodType += `.describe(${JSON.stringify(param.description)})`;
        }
        
        zodSchemaFields.push(`${param.name}: ${zodType}`);
      });
      
      const zodSchemaCode = zodSchemaFields.length > 0 
        ? `{ ${zodSchemaFields.join(", ")} }` 
        : "{}";

      const indentCode = (code: string, targetIndent: number): string => {
        const lines = code.split("\n");
        if (lines.length === 0) return "";
        
        let minIndent = Infinity;
        for (const line of lines) {
          if (line.trim() !== "") {
            const indent = line.match(/^\s*/)?.[0]?.length || 0;
            minIndent = Math.min(minIndent, indent);
          }
        }
        
        if (minIndent === Infinity) minIndent = 0;
        
        return lines
          .map((line) => {
            if (line.trim() === "") return "";
            const currentIndent = line.match(/^\s*/)?.[0]?.length || 0;
            const relativeIndent = currentIndent - minIndent;
            const trimmed = line.trimStart();
            return " ".repeat(targetIndent + relativeIndent) + trimmed;
          })
          .filter((line, index, arr) => {
            if (index === 0 && line === "") return false;
            if (index === arr.length - 1 && line === "") return false;
            return true;
          })
          .join("\n");
      };

      logger.debug("Wrapping node codes with logging", {
        nodeCount: codegenResults.length
      });
      
      const nodeCodes = codegenResults.map(({ nodeId, nodeLabel, nodeType, result, branchCondition, branchReason }, index) => {
        const nodeName = nodeLabel || nodeType;
        const nodeCode = result.code;
        
        logger.debug("Wrapping node code", {
          nodeId,
          nodeType,
          nodeName,
          position: index + 1,
          originalCodeLength: nodeCode.length
        });

        const indentedNodeCode = indentCode(nodeCode, 8);

        if (branchCondition) {
          const reason = branchReason || "branch_condition_not_met";
          return `
    if (${branchCondition}) {
      try {
        console.log({type:'WF_NODE_START',nodeId:'${nodeId}',nodeName:${JSON.stringify(nodeName)},nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId});
${indentedNodeCode}
        console.log({type:'WF_NODE_END',nodeId:'${nodeId}',nodeName:${JSON.stringify(nodeName)},nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['${nodeId}']?.output});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log({type:'WF_NODE_ERROR',nodeId:'${nodeId}',nodeName:${JSON.stringify(nodeName)},nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage});
        throw error;
      }
    } else {
      console.log({type:'WF_NODE_SKIP',nodeId:'${nodeId}',nodeName:${JSON.stringify(nodeName)},nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId,reason:'${reason}'});
    }`;
        }

        return `
    try {
      console.log({type:'WF_NODE_START',nodeId:'${nodeId}',nodeName:${JSON.stringify(nodeName)},nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId});
${indentedNodeCode}
      console.log({type:'WF_NODE_END',nodeId:'${nodeId}',nodeName:${JSON.stringify(nodeName)},nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['${nodeId}']?.output});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log({type:'WF_NODE_ERROR',nodeId:'${nodeId}',nodeName:${JSON.stringify(nodeName)},nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage});
      throw error;
    }`;
      }).join("\n");

      const workflowBindingName = `${finalClassName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_WORKFLOW`;
      
      logger.debug("Assembling final worker code", {
        className: finalClassName,
        hasMCPNodes,
        nodeCodeBlocks: codegenResults.length,
        totalNodeCodeLength: nodeCodes.length
      });
      
      let code: string;
      if (hasMCPNodes) {  
        code = `import { WorkflowEntrypoint } from 'cloudflare:workers';
import { McpAgent } from "./bundles/agents/agents.mcp.bundle.mjs";
import { McpServer } from "./bundles/mcp/mcp-sdk.bundle.mjs";
import { z } from "./bundles/zod/zod.bundle.mjs";

export class ${finalClassName} extends WorkflowEntrypoint {
  async run(event, step) {
    console.log({type:'WF_START',timestamp:Date.now(),instanceId:event.instanceId,eventTimestamp:event.timestamp,payload:event.payload});
    const _workflowResults = {};
    const _workflowState = {};
${nodeCodes}
    console.log({type:'WF_END',timestamp:Date.now(),instanceId:event.instanceId,results:_workflowResults});
    return _workflowResults;
  }
}

export class ${mcpClassName} extends McpAgent {
  server = new McpServer({
    name: "${serverName}",
    version: "1.0.0",
  });

  async init() {
    console.log('${mcpClassName}');

    this.server.tool(
      "${toolName}",
      ${zodSchemaCode},
      async (args) => {
        const instance = await this.env.${workflowBindingName}.create({
          id: crypto.randomUUID(),
          payload: args || {}
        });
        let status = await instance.status();

        console.log('${toolName}', status);

        while (status.status !== 'complete') {
          await new Promise(resolve => setTimeout(resolve, 5000));
          status = await instance.status();
          console.log('${toolName}', status);
          if (status.status === 'complete') {
            return {
              content: [{
                type: "text",
                text: JSON.stringify(status)
              }]
            };
          }
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(status)
          }]
        };
      }
    );
  }
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/sse')) {
      return ${mcpClassName}.serveSSE('/sse').fetch(req, env);
    }
    if (url.pathname.startsWith('/mcp')) {
      return ${mcpClassName}.serve('/mcp').fetch(req, env, ctx);
    }
    return new Response('Not found', { status: 404 });
  }
};`;
      } else {
        code = `import { WorkflowEntrypoint } from 'cloudflare:workers';

export class ${finalClassName} extends WorkflowEntrypoint {
  async run(event, step) {
    console.log({type:'WF_START',timestamp:Date.now(),instanceId:event.instanceId,eventTimestamp:event.timestamp,payload:event.payload});
    const _workflowResults = {};
    const _workflowState = {};
${nodeCodes}
    console.log({type:'WF_END',timestamp:Date.now(),instanceId:event.instanceId,results:_workflowResults});
    return _workflowResults;
  }
}

export default {
  async fetch(req, env) {
    console.log("🌐 === FETCH HANDLER STARTED ===");
    console.log("📡 Request URL:", req.url);
    console.log("📋 Request Method:", req.method);

    const instanceId = new URL(req.url).searchParams.get("instanceId");

    if (instanceId) {
      const instance = await env.${workflowBindingName}.get(instanceId);
      return Response.json({
        status: await instance.status()
      });
    }

    const newId = await crypto.randomUUID();
    let instance = await env.${workflowBindingName}.create({
      id: newId
    });
    return Response.json({
      id: instance.id,
      details: await instance.status()
    });
  }
}`;
      }

      const workerCodeDuration = Date.now() - workerCodeStart;
      logger.debug("Worker code generation completed", {
        className: finalClassName,
        hasMCPNodes,
        codeLength: code.length,
        lineCount: code.split("\n").length,
        duration: workerCodeDuration
      });

      return code;
    });
  }

  private static generateWranglerConfig(
    workflow: { name: string; nodes: Array<{ type: string }> },
    bindings: BindingConfiguration[],
    options?: CompilationOptions,
    workflowId?: string,
    className?: string
  ): Effect.Effect<string, { _tag: ErrorCode; message: string }> {
    return Effect.gen(function* (_) {
      const workflowName = options?.desiredWorkflowName || workflow.name;
      const finalClassName = className || (workflowId ? generateClassName(workflowId) : CODE_GENERATION.CLASS_NAME_PATTERN(workflow.name));
      const workflowBindingName = `${finalClassName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_WORKFLOW`;
      
      const hasMCPNodes = workflow.nodes.some(n => n.type === "mcp-tool-input" || n.type === "mcp-tool-output");
      const hasAINodes = bindings.some(b => b.type === BindingType.AI);
      const mcpClassName = hasMCPNodes ? `${finalClassName}MCP` : null;

      const allWranglerBindings = generateWranglerBindings(bindings);
      const wranglerBindings: Record<string, any> = { ...allWranglerBindings };
      
      if (hasMCPNodes && wranglerBindings.durable_objects) {
        delete wranglerBindings.durable_objects;
      }

      const workflows = [{
        name: finalClassName,
        binding: workflowBindingName,
        class_name: finalClassName
      }];

      const durableObjects: any = {};
      if (hasMCPNodes && mcpClassName) {
        durableObjects.bindings = [
          {
            class_name: mcpClassName,
            name: "MCP_OBJECT"
          }
        ];
        durableObjects.migrations = [
          {
            new_sqlite_classes: [mcpClassName],
            tag: "V1"
          }
        ];
      }

      if (hasAINodes) {
        wranglerBindings.ai = {
          binding: "AI"
        };
      }

      const config: any = {
        name: `${workflowName}-worker`,
        main: "src/index.ts",
        compatibility_date: "2024-01-01",
        workflows,
        ...wranglerBindings,
      };

      if (hasMCPNodes && Object.keys(durableObjects).length > 0) {
        config.durable_objects = durableObjects;
      }

      return JSON.stringify(config, null, 2);
    });
  }
}
