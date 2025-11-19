import { BaseNodeHandler } from "./base.handler";
import { ExecutionContext, ExecutionResult } from "../schemas/types";

export class ConditionalInlineHandler extends BaseNodeHandler {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    this.log(context, "Evaluating conditional");

    const config = context.config || {};
    const condition = config.condition || {};
    const inputData = context.inputData || {};

    try {
      const result = this.evaluateCondition(condition, inputData);
      this.log(context, `Condition result: ${result}`);

      return {
        success: true,
        output: {
          condition: result,
          branch: result ? "true" : "false"
        },
        logs: context.logs
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Conditional evaluation failed";
      this.log(context, `Conditional failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        logs: context.logs
      };
    }
  }

  private evaluateCondition(condition: any, inputData: any): boolean {
    if (condition.type === "simple") {
      const left = condition.left || "";
      const operator = condition.operator || "===";
      const right = condition.right;

      let leftValue = inputData[left];
      if (left.includes(".")) {
        leftValue = left.split(".").reduce((obj: any, key: string) => obj?.[key], inputData);
      }

      switch (operator) {
        case "===":
          return leftValue === right;
        case "!==":
          return leftValue !== right;
        case ">":
          return leftValue > right;
        case "<":
          return leftValue < right;
        case ">=":
          return leftValue >= right;
        case "<=":
          return leftValue <= right;
        default:
          return false;
      }
    } else if (condition.expression) {
      try {
        return new Function("data", "input", `return ${condition.expression}`)(inputData, inputData);
      } catch {
        return false;
      }
    }
    return true;
  }
}

