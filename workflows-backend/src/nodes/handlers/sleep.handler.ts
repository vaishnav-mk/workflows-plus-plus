import { BaseNodeHandler } from "./base.handler";
import { ExecutionContext, ExecutionResult } from "../schemas/types";

export class SleepHandler extends BaseNodeHandler {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    this.log(context, "Executing sleep");

    const config = context.config || {};
    let duration = 1000; // default 1 second

    if (typeof config.duration === "number") {
      duration = config.duration;
    } else if (config.duration?.type === "relative") {
      const multipliers: Record<string, number> = {
        ms: 1,
        seconds: 1000,
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000
      };
      duration = (config.duration.value || 1) * (multipliers[config.duration.unit] || 1000);
    }

    this.log(context, `Sleeping for ${duration}ms`);
    await new Promise((resolve) => setTimeout(resolve, duration));
    this.log(context, "Sleep completed");

    return {
      success: true,
      output: {
        duration,
        message: "Sleep completed"
      },
      logs: context.logs
    };
  }
}

