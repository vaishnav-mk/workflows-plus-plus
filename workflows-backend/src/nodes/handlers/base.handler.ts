import { z } from "zod";
import { ExecutionContext, ExecutionResult } from "../schemas/types";

export abstract class BaseNodeHandler {
  abstract execute(context: ExecutionContext): Promise<ExecutionResult>;

  protected log(context: ExecutionContext, message: string) {
    const timestamp = new Date().toISOString();
    context.logs.push(`[${timestamp}] ${message}`);
  }

  protected validateConfig(schema: z.ZodSchema, config: any) {
    return schema.safeParse(config);
  }
}
