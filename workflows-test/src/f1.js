import { WorkflowEntrypoint } from 'cloudflare:workers';

export class DragonSwiftMagicWorkflow extends WorkflowEntrypoint {
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
      console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'step_conditional_router_2',nodeName:"Conditional (Router)",nodeType:'conditional-router',timestamp:Date.now(),instanceId:event.instanceId}));
        
    _workflowResults.step_conditional_router_2 = await step.do('step_conditional_router_2', async () => {
      // Get condition value from input
      const conditionValue = _workflowState['step_http_request_1'].status;
      
      // Build routing object: {case1: boolean, case2: boolean, default: boolean}
      // Only one key will be true, indicating which route to take
      const routing = {
        'success': (_workflowState['step_http_request_1'].status === 200),
        'error': !(routing['success'])
      };
      
      return routing;
    });
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'step_conditional_router_2',nodeName:"Conditional (Router)",nodeType:'conditional-router',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['step_conditional_router_2']?.output}));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'step_conditional_router_2',nodeName:"Conditional (Router)",nodeType:'conditional-router',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage}));
      throw error;
    }

    if ((_workflowResults.step_conditional_router_2?.['success'] === true)) {
      try {
        console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'step_transform_0',nodeName:"Transform",nodeType:'transform',timestamp:Date.now(),instanceId:event.instanceId}));
        
    _workflowResults.step_transform_0 = await step.do('step_transform_0', async () => {
      const inputData = _workflowState['step_conditional_router_2']?.output || event.payload;
      const result = (() => { { status: "success", inputData: inputData } })();
      const output = { ...result, message: 'Data transformation completed successfully' };
      _workflowState['step_transform_0'] = {
        input: inputData,
        output: output
      };
      return output;
    });
        console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'step_transform_0',nodeName:"Transform",nodeType:'transform',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['step_transform_0']?.output}));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'step_transform_0',nodeName:"Transform",nodeType:'transform',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage}));
        throw error;
      }
    } else {
      console.log(JSON.stringify({type:'WF_NODE_SKIP',nodeId:'step_transform_0',nodeName:"Transform",nodeType:'transform',timestamp:Date.now(),instanceId:event.instanceId,reason:'route_success_not_taken'}));
    }

    if ((_workflowResults.step_conditional_router_2?.['error'] === true)) {
      try {
        console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'step_transform_1',nodeName:"Transform",nodeType:'transform',timestamp:Date.now(),instanceId:event.instanceId}));
        
    _workflowResults.step_transform_1 = await step.do('step_transform_1', async () => {
      const inputData = _workflowState['step_conditional_router_2']?.output || event.payload;
      const result = (() => { { status: "error", message: "Request failed" } })();
      const output = { ...result, message: 'Data transformation completed successfully' };
      _workflowState['step_transform_1'] = {
        input: inputData,
        output: output
      };
      return output;
    });
        console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'step_transform_1',nodeName:"Transform",nodeType:'transform',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['step_transform_1']?.output}));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'step_transform_1',nodeName:"Transform",nodeType:'transform',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage}));
        throw error;
      }
    } else {
      console.log(JSON.stringify({type:'WF_NODE_SKIP',nodeId:'step_transform_1',nodeName:"Transform",nodeType:'transform',timestamp:Date.now(),instanceId:event.instanceId,reason:'route_error_not_taken'}));
    }

    try {
      console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'step_return_5',nodeName:"Return",nodeType:'return',timestamp:Date.now(),instanceId:event.instanceId}));
        
    _workflowResults.step_return_5 = await step.do('step_return_5', async () => {
      const result = _workflowState['step_transform_0']?.output || event.payload;
      _workflowState['step_return_5'] = {
        input: _workflowState['step_transform_0']?.output || event.payload,
        output: result
      };
      return result;
    });
      console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'step_return_5',nodeName:"Return",nodeType:'return',timestamp:Date.now(),instanceId:event.instanceId,success:true,output:_workflowState['step_return_5']?.output}));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'step_return_5',nodeName:"Return",nodeType:'return',timestamp:Date.now(),instanceId:event.instanceId,success:false,error:errorMessage}));
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
      const instance = await env.DRAGONSWIFTMAGICWORKFLOW_WORKFLOW.get(instanceId);
      return Response.json({
        status: await instance.status()
      });
    }

    const newId = await crypto.randomUUID();
    let instance = await env.DRAGONSWIFTMAGICWORKFLOW_WORKFLOW.create({
      id: newId
    });
    return Response.json({
      id: instance.id,
      details: await instance.status()
    });
  }
}