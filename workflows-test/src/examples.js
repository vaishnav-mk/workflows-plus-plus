import { WorkflowEntrypoint } from 'cloudflare:workers';
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export class GeneratedworkflowWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    // === WORKFLOW START (one-liner) ===
    console.log(JSON.stringify({type:'WF_START',timestamp:Date.now(),instanceId:event.instanceId,eventTimestamp:event.timestamp,payload:event.payload}));

    const _workflowResults = {};
      const _workflowState = {};

    
    // === NODE START: MCP-TOOL-INPUT (mcp-tool-input) [node-1763299499039-x17zpm1a1] ===
    console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'node-1763299499039-x17zpm1a1',nodeName:'mcp-tool-input',nodeType:'mcp-tool-input',timestamp:Date.now(),instanceId:event.instanceId}));
    try {
      
    _workflowState['node-1763299499039-x17zpm1a1'] = {
      input: event.payload,
      output: event.payload
    };
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'node-1763299499039-x17zpm1a1',nodeName:'mcp-tool-input',nodeType:'mcp-tool-input',timestamp:Date.now(),instanceId:event.instanceId,success:true}));
    } catch (error) {
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'node-1763299499039-x17zpm1a1',nodeName:'mcp-tool-input',nodeType:'mcp-tool-input',timestamp:Date.now(),instanceId:event.instanceId,error:error.message||String(error)}));
      throw error;
    }
    // === NODE END: MCP-TOOL-INPUT (mcp-tool-input) [node-1763299499039-x17zpm1a1] ===


    // === NODE START: HTTP-REQUEST (http-request) [node-1763299488374-o36zmkknq] ===
    console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'node-1763299488374-o36zmkknq',nodeName:'http-request',nodeType:'http-request',timestamp:Date.now(),instanceId:event.instanceId}));
    try {
      
    _workflowResults.httpRequest = await step.do('httpRequest', async () => {
      const inputData = _workflowState['node-1763299499039-x17zpm1a1']?.output || event.payload;
      const response = await fetch("https://api.agify.io?name=steve", {
        method: 'GET',
        headers: {
          // No custom headers
        },
        
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const body = await response.json();
      const result = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: body,
        message: 'HTTP request completed successfully'
      };
      _workflowState['node-1763299488374-o36zmkknq'] = {
        input: inputData,
        output: result
      };
      return result;
    });
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'node-1763299488374-o36zmkknq',nodeName:'http-request',nodeType:'http-request',timestamp:Date.now(),instanceId:event.instanceId,success:true}));
    } catch (error) {
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'node-1763299488374-o36zmkknq',nodeName:'http-request',nodeType:'http-request',timestamp:Date.now(),instanceId:event.instanceId,error:error.message||String(error)}));
      throw error;
    }
    // === NODE END: HTTP-REQUEST (http-request) [node-1763299488374-o36zmkknq] ===


    // === NODE START: KV-PUT (kv-put) [node-1763299488374-f7dak0fd8] ===
    console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'node-1763299488374-f7dak0fd8',nodeName:'kv-put',nodeType:'kv-put',timestamp:Date.now(),instanceId:event.instanceId}));
    try {
      
    _workflowResults.kvPut = await step.do("kvPut", async () => {
      const inputData = _workflowState['node-1763299488374-o36zmkknq']?.output || event.payload;
      const key = `name`;
      const value = "vaish";
      await this.env["MY_KV"].put(key, value);
      const result = { success: true, key };
      _workflowState['node-1763299488374-f7dak0fd8'] = {
        input: inputData,
        output: result
      };
      return result;
    });
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'node-1763299488374-f7dak0fd8',nodeName:'kv-put',nodeType:'kv-put',timestamp:Date.now(),instanceId:event.instanceId,success:true}));
    } catch (error) {
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'node-1763299488374-f7dak0fd8',nodeName:'kv-put',nodeType:'kv-put',timestamp:Date.now(),instanceId:event.instanceId,error:error.message||String(error)}));
      throw error;
    }
    // === NODE END: KV-PUT (kv-put) [node-1763299488374-f7dak0fd8] ===


    // === NODE START: KV-GET (kv-get) [node-1763299488374-3jyb7f712] ===
    console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'node-1763299488374-3jyb7f712',nodeName:'kv-get',nodeType:'kv-get',timestamp:Date.now(),instanceId:event.instanceId}));
    try {
      
    _workflowResults.kvGet = await step.do("kvGet", async () => {
      const inputData = _workflowState['node-1763299488374-f7dak0fd8']?.output || event.payload;
      const key = `name`;
      const value = await this.env["MY_KV"].get(key);
      const result = {
        value,
        exists: value !== null,
        metadata: value ? { key } : null
      };
      _workflowState['node-1763299488374-3jyb7f712'] = {
        input: inputData,
        output: result
      };
      return result;
    });
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'node-1763299488374-3jyb7f712',nodeName:'kv-get',nodeType:'kv-get',timestamp:Date.now(),instanceId:event.instanceId,success:true}));
    } catch (error) {
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'node-1763299488374-3jyb7f712',nodeName:'kv-get',nodeType:'kv-get',timestamp:Date.now(),instanceId:event.instanceId,error:error.message||String(error)}));
      throw error;
    }
    // === NODE END: KV-GET (kv-get) [node-1763299488374-3jyb7f712] ===


    // === NODE START: MCP-TOOL-OUTPUT (mcp-tool-output) [node-1763299499039-ah5tido1z] ===
    console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'node-1763299499039-ah5tido1z',nodeName:'mcp-tool-output',nodeType:'mcp-tool-output',timestamp:Date.now(),instanceId:event.instanceId}));
    try {
      
    _workflowResults.mcpToolOutput = await step.do('mcpToolOutput', async () => {
      const inputData = _workflowState['node-1763299488374-3jyb7f712']?.output || event.payload;
      const result = {
        content: [{
          type: "json",
          text: JSON.stringify(_workflowState['node-1763299488374-3jyb7f712']?.output || event.payload)
        }]
      };
      _workflowState['node-1763299499039-ah5tido1z'] = {
        input: inputData,
        output: result
      };
      return result;
    });
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'node-1763299499039-ah5tido1z',nodeName:'mcp-tool-output',nodeType:'mcp-tool-output',timestamp:Date.now(),instanceId:event.instanceId,success:true}));
    } catch (error) {
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'node-1763299499039-ah5tido1z',nodeName:'mcp-tool-output',nodeType:'mcp-tool-output',timestamp:Date.now(),instanceId:event.instanceId,error:error.message||String(error)}));
      throw error;
    }
    // === NODE END: MCP-TOOL-OUTPUT (mcp-tool-output) [node-1763299499039-ah5tido1z] ===

    // === WORKFLOW END (one-liner) ===
    console.log(JSON.stringify({type:'WF_END',timestamp:Date.now(),instanceId:event.instanceId,results:_workflowResults}));
    return _workflowResults;
  }
}

export class GeneratedworkflowWorkflowMCP extends McpAgent {
  server = new McpServer({
		name: "GeneratedworkflowWorkflowMCP-i2nfjx-test-32",
		version: "1.0.0",
	});

  async init() {
    console.log('GeneratedworkflowWorkflowMCP');

    this.server.tool(
      "GeneratedworkflowWorkflowMCP-i2nfjx-test-32",
      {},
      async (args) => {
        const instance = await this.env.GENERATEDWORKFLOW_WORKFLOW.create({
          id: crypto.randomUUID(),
          payload: args || {}
        });
        let status = await instance.status();

        console.log('GeneratedworkflowWorkflowMCP-i2nfjx-test-32', status);

        while (status.status !== 'complete') {
          await new Promise(resolve => setTimeout(resolve, 5000));
          status = await instance.status();
          console.log('GeneratedworkflowWorkflowMCP-i2nfjx-test-32', status);
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
      console
      return GeneratedworkflowWorkflowMCP.serveSSE('/sse').fetch(req, env);
    }
    
    if (url.pathname.startsWith('/mcp')) {
      console.log('mcp');
      return GeneratedworkflowWorkflowMCP.serve('/mcp').fetch(req, env, ctx);
    }
    
    const instanceId = url.searchParams.get("instanceId");

    if (instanceId) {
      const instance = await env.GENERATEDWORKFLOW_WORKFLOW.get(instanceId);
      return Response.json({
        status: await instance.status(),
      });
    }

    const newId = await crypto.randomUUID();
    let instance = await env.GENERATEDWORKFLOW_WORKFLOW.create({
      id: newId
    });
    return Response.json({
      id: instance.id,
      details: await instance.status()
    });
  },
};