import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent
} from "cloudflare:workers";

type Env = {
  GENERATEDWORKFLOW_WORKFLOW: Workflow;
};

type Params = {
  [key: string]: any;
};

export class GeneratedworkflowWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    console.log("=== WORKFLOW STARTED ===");
    console.log("Workflow Instance ID:", event.instanceId);
    console.log("Event Payload:", JSON.stringify(event.payload, null, 2));
    console.log("Event Timestamp:", event.timestamp);

    const workflowResults: any = {};

    // Workflow entry point
    // No parameters to extract from payload

    // Transform Node: transform-1
    console.log("=== TRANSFORM NODE ===");
    workflowResults.transform = await step.do("transform", async () => {
      console.log("Preparing input data for transformation...");
      const inputData = event.payload;
      console.log("Transform Input Data:", JSON.stringify(inputData, null, 2));

      console.log("Processing data transformation...");
      const result = { message: "Hello from workflow!", inputData: inputData };

      console.log("Transform Output Data:", JSON.stringify(result, null, 2));
      const finalResult = {
        ...result,
        message: "Data transformation completed successfully"
      };
      console.log("Transform result:", JSON.stringify(finalResult, null, 2));
      return finalResult;
    });

    // Return Node: end-1
    console.log("=== RETURN NODE ===");
    workflowResults.return = await step.do("return", async () => {
      console.log("Preparing final result...");
      const result = "success";
      console.log("Final result prepared:", JSON.stringify(result, null, 2));
      return result;
    });

    console.log("=== WORKFLOW COMPLETED ===");
    return workflowResults;
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    console.log("🌐 === FETCH HANDLER STARTED ===");
    console.log("📡 Request URL:", req.url);
    console.log("📋 Request Method:", req.method);

    const instanceId = new URL(req.url).searchParams.get("instanceId");

    if (instanceId) {
      const instance = await env.GENERATEDWORKFLOW_WORKFLOW.get(instanceId);
      return Response.json({
        status: await instance.status()
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
  }
};
