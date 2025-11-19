import { NodeRegistry } from "../nodes/registry";
import { EntryHandler } from "../nodes/handlers/entry.handler";
import { HttpRequestHandler } from "../nodes/handlers/http-request.handler";
import { TransformHandler } from "../nodes/handlers/transform.handler";
import { SleepHandler } from "../nodes/handlers/sleep.handler";
import { ConditionalInlineHandler } from "../nodes/handlers/conditional-inline.handler";
import { ExecutionContext, ExecutionResult } from "../nodes/schemas/types";
import { BaseNodeHandler } from "../nodes/handlers/base.handler";

export type ExecutionInput = {
  type: string;
  config: any;
  inputData?: any;
  context?: any;
};

export class NodeExecutionService {
  private handlers: Map<string, BaseNodeHandler> = new Map();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    this.handlers.set("entry", new EntryHandler());
    this.handlers.set("http-request", new HttpRequestHandler());
    this.handlers.set("transform", new TransformHandler());
    this.handlers.set("sleep", new SleepHandler());
    this.handlers.set("conditional-inline", new ConditionalInlineHandler());
  }

  async execute(input: ExecutionInput): Promise<ExecutionResult> {
    const logs: string[] = [];
    const log = (message: string) => {
      const timestamp = new Date().toISOString();
      logs.push(`[${timestamp}] ${message}`);
    };

    log(`Executing node type: ${input.type}`);

    try {
      const nodeDefinition = NodeRegistry.getNodeByType(input.type);

      if (!nodeDefinition) {
        return {
          success: false,
          error: `Unknown node type: ${input.type}`,
          logs
        };
      }

      const configValidation = nodeDefinition.configSchema.safeParse(
        input.config
      );
      if (!configValidation.success) {
        log(
          `Configuration validation failed: ${configValidation.error.message}`
        );
        return {
          success: false,
          error: `Configuration validation failed: ${configValidation.error
            .message}`,
          logs
        };
      }

      if (!nodeDefinition.capabilities.playgroundCompatible) {
        const errorMsg = `Node type ${input.type} requires Cloudflare runtime environment`;
        log(errorMsg);
        return {
          success: false,
          error: errorMsg,
          logs
        };
      }

      const handler = this.handlers.get(input.type);
      if (!handler) {
        const errorMsg = `No execution handler found for ${input.type}`;
        log(errorMsg);
        return {
          success: false,
          error: errorMsg,
          logs
        };
      }

      const context: ExecutionContext = {
        config: input.config,
        inputData: input.inputData || {},
        logs
      };

      return await handler.execute(context);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log(`Error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        logs
      };
    }
  }
}
