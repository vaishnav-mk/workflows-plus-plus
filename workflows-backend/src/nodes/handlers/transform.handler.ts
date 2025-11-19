import { BaseNodeHandler } from "./base.handler";
import { ExecutionContext, ExecutionResult } from "../schemas/types";

export class TransformHandler extends BaseNodeHandler {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    this.log(context, "Executing transform");

    const config = context.config || {};
    const code = config.code || "return data;";
    const inputData = context.inputData || {};

    try {
      const transformedData = new Function("data", "input", code)(
        inputData,
        inputData
      );
      this.log(context, "Transform executed successfully");
      return {
        success: true,
        output: transformedData,
        logs: context.logs
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Transform failed";
      this.log(context, `Transform failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        logs: context.logs
      };
    }
  }
}
