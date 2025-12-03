/**
 * Workflow Compiler - Main compiler orchestrator
 */

import { Effect } from "effect";
import { WorkflowNodeDefinition, GraphContext, CodeGenContext, CodeGenResult, CompilationResult, CompilationOptions } from "../../core/types";
import { CompilationStatus, ErrorCode, NodeType, BindingType } from "../../core/enums";
import { GraphAnalyzer } from "./graph-analyzer";
import { WorkflowValidator } from "./workflow-validator";
import { BindingAnalyzer } from "./binding-analyzer";
import { CODE_GENERATION } from "../../core/constants";
import { generateClassName, generateWorkflowId } from "../../core/utils/id-generator";
import * as NodeLibrary from "../../library";
import { logger } from "../../core/logging/logger";

export class WorkflowCompiler {
  /**
   * Compile workflow to TypeScript code
   */
  static compile(
    workflow: {
      name: string;
      nodes: Array<{ id: string; type: string; data?: Record<string, unknown>; config?: Record<string, unknown> }>;
      edges: Array<{ id: string; source: string; target: string }>;
    },
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

      // Step 1: Validate workflow
      const validateStart = Date.now();
      logger.debug("Validating workflow structure");
      yield* _(WorkflowValidator.validateWorkflow(workflow.nodes, workflow.edges));
      logger.logPerformance("workflow_validation", Date.now() - validateStart, {
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length
      });
      
      // Step 2: Build graph context
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
      
      // Step 3: Generate code for all nodes
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
      
      // Step 4: Generate workflow ID and analyze bindings
      const workflowId = options?.workflowId || generateWorkflowId();
      logger.debug("Workflow ID generated", { workflowId });
      
      const bindingsStart = Date.now();
      const bindings = BindingAnalyzer.aggregateBindings(codegenResults, workflowId);
      logger.logPerformance("binding_analysis", Date.now() - bindingsStart, {
        bindingCount: bindings.length,
        bindings: bindings.filter(b => b && b.name && b.type).map(b => ({ name: b.name, type: b.type }))
      });
      logger.info("Bindings analyzed", {
        bindingCount: bindings.length,
        bindings: bindings.filter(b => b && b.name && b.type).map(b => ({ name: b.name, type: b.type }))
      });
      
      // Step 5: Generate worker code
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
      
      // Generate class name from workflow ID
      const className = options?.className || generateClassName(workflowId);
      logger.debug("Class name generated", { className });

      // Step 6: Generate wrangler config
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

  /**
   * Generate code for all nodes
   */
  private static generateCodeForNodes(
    nodes: Array<{ id: string; type: string; data?: Record<string, unknown>; config?: Record<string, unknown> }>,
    graphContext: GraphContext
  ): Effect.Effect<Array<{ nodeId: string; nodeLabel: string; nodeType: string; result: CodeGenResult }>, { _tag: ErrorCode; message: string }> {
    return Effect.gen(function* (_) {
      const results: Array<{ nodeId: string; nodeLabel: string; nodeType: string; result: CodeGenResult }> = [];
      
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
        // Use nodeId directly as stepName (nodeId is already standardized like step_entry_0)
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
        
        // Validate result structure
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
        
        // Ensure requiredBindings is an array and filter out invalid entries
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

        results.push({
          nodeId,
          nodeLabel,
          nodeType: node.type,
          result: {
            code: result.code,
            requiredBindings: validBindings
          },
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

  /**
   * Get node definition from library
   */
  private static getNodeDefinition(nodeType: string): WorkflowNodeDefinition<unknown> | null {
    // Type assertions needed because nodes have specific config types
    const nodeTypeMap: Record<string, WorkflowNodeDefinition<unknown>> = {
      [NodeType.ENTRY]: NodeLibrary.EntryNode as WorkflowNodeDefinition<unknown>,
      [NodeType.RETURN]: NodeLibrary.ReturnNode as WorkflowNodeDefinition<unknown>,
      [NodeType.SLEEP]: NodeLibrary.SleepNode as WorkflowNodeDefinition<unknown>,
      [NodeType.KV_GET]: NodeLibrary.KVGetNode as WorkflowNodeDefinition<unknown>,
      [NodeType.KV_PUT]: NodeLibrary.KVPutNode as WorkflowNodeDefinition<unknown>,
      [NodeType.D1_QUERY]: NodeLibrary.D1QueryNode as WorkflowNodeDefinition<unknown>,
      [NodeType.HTTP_REQUEST]: NodeLibrary.HttpRequestNode as WorkflowNodeDefinition<unknown>,
      [NodeType.TRANSFORM]: NodeLibrary.TransformNode as WorkflowNodeDefinition<unknown>,
      [NodeType.VALIDATE]: NodeLibrary.ValidateNode as WorkflowNodeDefinition<unknown>,
      [NodeType.CONDITIONAL_INLINE]: NodeLibrary.ConditionalInlineNode as WorkflowNodeDefinition<unknown>,
      [NodeType.CONDITIONAL_ROUTER]: NodeLibrary.ConditionalRouterNode as WorkflowNodeDefinition<unknown>,
      [NodeType.FOR_EACH]: NodeLibrary.ForEachNode as WorkflowNodeDefinition<unknown>,
      [NodeType.WAIT_EVENT]: NodeLibrary.WaitEventNode as WorkflowNodeDefinition<unknown>,
      [NodeType.WORKERS_AI]: NodeLibrary.WorkersAINode as WorkflowNodeDefinition<unknown>,
      [NodeType.MCP_TOOL_INPUT]: NodeLibrary.MCPToolInputNode as WorkflowNodeDefinition<unknown>,
      [NodeType.MCP_TOOL_OUTPUT]: NodeLibrary.MCPToolOutputNode as WorkflowNodeDefinition<unknown>,
    };
    return nodeTypeMap[nodeType] || null;
  }

  /**
   * Generate worker TypeScript code
   */
  private static generateWorkerCode(
    workflow: { name: string; nodes: Array<{ id: string; type: string; data?: Record<string, unknown> }> },
    codegenResults: Array<{ nodeId: string; nodeLabel: string; nodeType: string; result: CodeGenResult }>,
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

      // Generate class name from workflow ID if not provided
      const finalClassName = options?.className || (workflowId ? generateClassName(workflowId) : className);
      
      const hasMCPNodes = workflow.nodes.some(n => n.type === "mcp-tool-input" || n.type === "mcp-tool-output");
      const mcpInputNode = workflow.nodes.find(n => n.type === "mcp-tool-input");
      const mcpConfig = (mcpInputNode?.data?.config || {}) as Record<string, unknown>;
      
      // Generate MCP class name and server name
      const mcpClassName = `${finalClassName}MCP`;
      const serverName = mcpClassName; // Use MCP class name for server (e.g., "GhostCrystalSatisfiedMCP")
      const toolName = (mcpConfig.toolName as string) || `${finalClassName}MCPToolMain`;
      const toolDescription = (mcpConfig.description as string) || "Workflow tool exposed via MCP";
      const toolParameters = (mcpConfig.parameters as Array<{ name: string; type: string; required?: boolean; description?: string }>) || [];
      
      const toolSchema: Record<string, unknown> = {
        type: "object",
        properties: {} as Record<string, unknown>,
        required: [] as string[]
      };
      
      toolParameters.forEach(param => {
        const propType = param.type === "number" ? "number" : 
                        param.type === "boolean" ? "boolean" :
                        param.type === "array" ? "array" :
                        param.type === "object" ? "object" : "string";
        (toolSchema.properties as Record<string, unknown>)[param.name] = {
          type: propType,
          description: param.description || ""
        };
        if (param.required) {
          (toolSchema.required as string[]).push(param.name);
        }
      });

      // Generate wrapped node codes with START/END logs
      logger.debug("Wrapping node codes with logging", {
        nodeCount: codegenResults.length
      });
      
      const nodeCodes = codegenResults.map(({ nodeId, nodeLabel, nodeType, result }, index) => {
        const nodeName = nodeLabel || nodeType;
        const nodeCode = result.code;
        
        logger.debug("Wrapping node code", {
          nodeId,
          nodeType,
          nodeName,
          position: index + 1,
          originalCodeLength: nodeCode.length
        });
        
        // Wrap node code with START and END logs (single-line for minification)
        return `
    try {
      console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'${nodeId}',nodeName:${JSON.stringify(nodeName)},nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId}));
        ${nodeCode}
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'${nodeId}',nodeName:${JSON.stringify(nodeName)},nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['${nodeId}']?.output}));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'${nodeId}',nodeName:${JSON.stringify(nodeName)},nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage}));
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
        // Use the MCP entrypoints directly from the installed packages.
        // Cloudflare's bundler (via Wrangler / Workers API) will resolve these
        // from node_modules when deploying the compiled worker.
        code = `import { WorkflowEntrypoint } from 'cloudflare:workers';
import { McpAgent } from "./bundles/agents/agents.mcp.bundle.mjs";
import { McpServer } from "./bundles/mcp/mcp-sdk.bundle.mjs";

export class ${finalClassName} extends WorkflowEntrypoint {
  async run(event, step) {
    console.log(JSON.stringify({type:'WF_START',timestamp:Date.now(),instanceId:event.instanceId,eventTimestamp:event.timestamp,payload:event.payload}));
    const _workflowResults = {};
    const _workflowState = {};
${nodeCodes}
    console.log(JSON.stringify({type:'WF_END',timestamp:Date.now(),instanceId:event.instanceId,results:_workflowResults}));
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
      {},
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
    console.log(JSON.stringify({type:'WF_START',timestamp:Date.now(),instanceId:event.instanceId,eventTimestamp:event.timestamp,payload:event.payload}));
    const _workflowResults = {};
    const _workflowState = {};
${nodeCodes}
    console.log(JSON.stringify({type:'WF_END',timestamp:Date.now(),instanceId:event.instanceId,results:_workflowResults}));
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

  /**
   * Generate wrangler config
   */
  private static generateWranglerConfig(
    workflow: { name: string; nodes: Array<{ type: string }> },
    bindings: Array<{ name: string; type: BindingType; usage: Array<{ nodeId: string; nodeLabel: string; nodeType: string }> }>,
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

      // Generate wrangler bindings, but exclude durable objects if we have MCP nodes
      // (we'll add MCP durable objects separately with custom configuration)
      const allWranglerBindings = BindingAnalyzer.generateWranglerBindings(bindings);
      const wranglerBindings: Record<string, any> = { ...allWranglerBindings };
      
      // Remove durable_objects from wranglerBindings if MCP nodes exist (we'll add custom MCP durable objects)
      if (hasMCPNodes && wranglerBindings.durable_objects) {
        delete wranglerBindings.durable_objects;
      }

      // Add workflows section
      const workflows = [{
        name: finalClassName,
        binding: workflowBindingName,
        class_name: finalClassName
      }];

      // Add MCP durable object bindings if MCP nodes exist
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

      // Update AI binding format if AI nodes exist - always use "AI" as binding name
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

      // Add durable objects if MCP exists
      if (hasMCPNodes && Object.keys(durableObjects).length > 0) {
        config.durable_objects = durableObjects;
      }

      return JSON.stringify(config, null, 2);
    });
  }
}

