import { BaseNodeHandler } from "./base.handler";
import { ExecutionContext, ExecutionResult } from "../schemas/types";

export class EntryHandler extends BaseNodeHandler {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    this.log(context, "Entry node - extracting input parameters");

    const config = context.config || {};
    const params = config.params || [];
    const payload = context.inputData || {};

    const extractedParams: Record<string, any> = {};
    for (const param of params) {
      if (param.name in payload) {
        extractedParams[param.name] = payload[param.name];
      } else if (param.defaultValue !== undefined) {
        extractedParams[param.name] = param.defaultValue;
      }
    }

    return {
      success: true,
      output: {
        event: {
          instanceId: "mock-instance-id",
          timestamp: Date.now(),
          payload: extractedParams
        },
        payload: extractedParams
      },
      logs: context.logs
    };
  }
}
