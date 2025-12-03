import { WorkflowEntrypoint } from 'cloudflare:workers';

export class GhostCrystalSatisfied extends WorkflowEntrypoint {
  async run(event, step) {
    console.log(JSON.stringify({type:'WF_START',timestamp:Date.now(),instanceId:event.instanceId,eventTimestamp:event.timestamp,payload:event.payload}));
    const _workflowResults = {};
    const _workflowState = {};

    try {
      console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'step_entry_0',nodeName:"Entry",nodeType:'entry',timestamp:Date.now(),instanceId:event.instanceId}));
        
    // Workflow entry point
    _workflowState['step_entry_0'] = {
      input: event.payload,
      output: event.payload
    };
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'step_entry_0',nodeName:"Entry",nodeType:'entry',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['step_entry_0']?.output}));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'step_entry_0',nodeName:"Entry",nodeType:'entry',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage}));
      throw error;
    }

    try {
      console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'step_http_request_1',nodeName:"HTTP Request",nodeType:'http-request',timestamp:Date.now(),instanceId:event.instanceId}));
        
    _workflowResults.step_http_request_1 = await step.do('step_http_request_1', async () => {
      const inputData = _workflowState['step_entry_0']?.output || event.payload;
      const response = await fetch("https://api.jolpi.ca/ergast/f1/current/driverStandings.json ", {
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
      const response = await this.env.AI.run("@cf/meta/llama-4-scout-17b-16e-instruct", {
        prompt: `take ${JSON.stringify(_workflowState['step_http_request_1'].output.body)} and tell me who do you think is going to win the world championship`
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
      console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'step_return_2',nodeName:"Return",nodeType:'return',timestamp:Date.now(),instanceId:event.instanceId}));
        
    _workflowResults.step_return_2 = await step.do('step_return_2', async () => {
      const result = _workflowState['step_workers-ai_3']?.output || event.payload;
      _workflowState['step_return_2'] = {
        input: _workflowState['step_workers-ai_3']?.output || event.payload,
        output: result
      };
      return result;
    });
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'step_return_2',nodeName:"Return",nodeType:'return',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['step_return_2']?.output}));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'step_return_2',nodeName:"Return",nodeType:'return',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage}));
      throw error;
    }
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
      const instance = await env.GHOSTCRYSTALSATISFIED_WORKFLOW.get(instanceId);
      return Response.json({
        status: await instance.status()
      });
    }

    const newId = await crypto.randomUUID();
    let instance = await env.GHOSTCRYSTALSATISFIED_WORKFLOW.create({
      id: newId
    });
    return Response.json({
      id: instance.id,
      details: await instance.status()
    });
  }
}