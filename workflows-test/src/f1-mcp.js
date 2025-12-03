import { WorkflowEntrypoint } from 'cloudflare:workers';
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class SatisfiedRiverBraveWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    console.log(JSON.stringify({type:'WF_START',timestamp:Date.now(),instanceId:event.instanceId,eventTimestamp:event.timestamp,payload:event.payload}));
    const _workflowResults = {};
    const _workflowState = {};

    try {
      console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'step_entry_0',nodeName:"MCP Tool Input",nodeType:'mcp-tool-input',timestamp:Date.now(),instanceId:event.instanceId}));
        
    _workflowState['step_entry_0'] = {
      input: event.payload,
      output: event.payload
    };
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'step_entry_0',nodeName:"MCP Tool Input",nodeType:'mcp-tool-input',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['step_entry_0']?.output}));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'step_entry_0',nodeName:"MCP Tool Input",nodeType:'mcp-tool-input',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage}));
      throw error;
    }

    try {
      console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'step_http_request_1',nodeName:"HTTP Request",nodeType:'http-request',timestamp:Date.now(),instanceId:event.instanceId}));
        
    _workflowResults.step_http_request_1 = await step.do('step_http_request_1', async () => {
      const inputData = _workflowState['step_entry_0']?.output || event.payload;
      const response = await fetch("https://api.jolpi.ca/ergast/f1/current/driverStandings.json", {
        method: 'GET',
        headers: {
          // No custom headers
        },
        
        signal: AbortSignal.timeout(150000)
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
      _workflowState['step_http_request_1'] = {
        input: inputData,
        output: result
      };
      return result;
    });
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'step_http_request_1',nodeName:"HTTP Request",nodeType:'http-request',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['step_http_request_1']?.output}));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'step_http_request_1',nodeName:"HTTP Request",nodeType:'http-request',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage}));
      throw error;
    }

    try {
      console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'step_workers-ai_3',nodeName:"Workers AI",nodeType:'workers-ai',timestamp:Date.now(),instanceId:event.instanceId}));
        
    _workflowResults.step_workers_ai_3 = await step.do('step_workers-ai_3', async () => {
      const inputData = _workflowState['step_http_request_1']?.output || event.payload;
      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        prompt: `based on the current f1 standings ${JSON.stringify(_workflowState['step_http_request_1'].output.body)} who do you think will win the world championship?`
      });
      const result = {
        response: response,
        text: response.response || response.text || JSON.stringify(response),
        usage: response.usage || {}
      };
      _workflowState['step_workers-ai_3'] = {
        input: inputData,
        output: result
      };
      return result;
    });
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'step_workers-ai_3',nodeName:"Workers AI",nodeType:'workers-ai',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['step_workers-ai_3']?.output}));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'step_workers-ai_3',nodeName:"Workers AI",nodeType:'workers-ai',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage}));
      throw error;
    }

    try {
      console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'step_return_2',nodeName:"MCP Tool Output",nodeType:'mcp-tool-output',timestamp:Date.now(),instanceId:event.instanceId}));
        
    _workflowResults.step_return_2 = await step.do('step_return_2', async () => {
      const inputData = _workflowState['step_workers-ai_3']?.output || event.payload;
      const result = {
        content: [{
          type: "json",
          text: JSON.stringify(_workflowState['step_workers-ai_3']?.output || event.payload)
        }]
      };
      _workflowState['step_return_2'] = {
        input: inputData,
        output: result
      };
      return result;
    });
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'step_return_2',nodeName:"MCP Tool Output",nodeType:'mcp-tool-output',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['step_return_2']?.output}));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'step_return_2',nodeName:"MCP Tool Output",nodeType:'mcp-tool-output',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage}));
      throw error;
    }
    console.log(JSON.stringify({type:'WF_END',timestamp:Date.now(),instanceId:event.instanceId,results:_workflowResults}));
    return _workflowResults;
  }
}

export class SatisfiedRiverBraveWorkflowMCP extends McpAgent {
  server = new McpServer({
    name: "SatisfiedRiverBraveWorkflowMCP",
    version: "1.0.0",
  });

  async init() {
    console.log('SatisfiedRiverBraveWorkflowMCP');

    this.server.tool(
      "SatisfiedRiverBraveWorkflowMCPToolMain",
      {},
      async (args) => {
        const instance = await this.env.SATISFIEDRIVERBRAVEWORKFLOW_WORKFLOW.create({
          id: crypto.randomUUID(),
          payload: args || {}
        });
        let status = await instance.status();

        console.log('SatisfiedRiverBraveWorkflowMCPToolMain', status);

        while (status.status !== 'complete') {
          await new Promise(resolve => setTimeout(resolve, 5000));
          status = await instance.status();
          console.log('SatisfiedRiverBraveWorkflowMCPToolMain', status);
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
      return SatisfiedRiverBraveWorkflowMCP.serveSSE('/sse').fetch(req, env);
    }
    if (url.pathname.startsWith('/mcp')) {
    console.log("Requesting MCP");
    console.log(SatisfiedRiverBraveWorkflowMCP);
    console.log(env);
    console.log(ctx);
    console.log(req);
      return SatisfiedRiverBraveWorkflowMCP.serve('/mcp').fetch(req, env, ctx);
    }
    return new Response('Not found', { status: 404 });
  }
};