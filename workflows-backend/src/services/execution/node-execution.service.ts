/**
 * Node Execution Service
 * Executes node logic in a safe environment for testing
 */

import { NodeRegistry } from "../../catalog/registry";
import { ExecutionRequest, ExecutionResult } from "./types";
import { ExecutionError } from "./errors";
import { ErrorCode } from "../../core/enums";
import { logger } from "../../core/logging/logger";
import { WorkflowNodeDefinition } from "../../core/types";

export class NodeExecutionService {
  async executeNode(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    logger.info("Executing node", { nodeType: request.type });

    try {
      const nodeDefinition = NodeRegistry.getNode(request.type);
      if (!nodeDefinition) {
        throw new ExecutionError(
          ErrorCode.NODE_NOT_FOUND,
          `Node type '${request.type}' not found`
        );
      }

      const validationResult = nodeDefinition.configSchema.safeParse(request.config || {});
      if (!validationResult.success) {
        throw new ExecutionError(
          ErrorCode.INVALID_CONFIG,
          `Invalid node configuration: ${validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
        );
      }

      const result = await this.executeNodeLogic(
        nodeDefinition,
        request.config,
        request.inputData || {}
      );

      const duration = Date.now() - startTime;
      logger.logPerformance("node_execution", duration, {
        nodeType: request.type,
        success: result.success
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Node execution failed", error instanceof Error ? error : new Error(errorMessage), {
        nodeType: request.type,
        duration
      });

      if (error instanceof ExecutionError) {
        throw error;
      }

      return {
        output: {},
        logs: [`Execution failed: ${errorMessage}`],
        duration: Date.now() - startTime,
        success: false,
        error: {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }

  private async executeNodeLogic(
    nodeDefinition: WorkflowNodeDefinition,
    config: Record<string, unknown>,
    inputData: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const logs: string[] = [];
    const startTime = Date.now();

    try {
      if (nodeDefinition.presetOutput) {
        logs.push(`Using preset output for node type: ${nodeDefinition.metadata.type}`);
        return {
          output: nodeDefinition.presetOutput,
          logs,
          duration: Date.now() - startTime,
          success: true
        };
      }

      const simulatedOutput = this.simulateNodeExecution(
        nodeDefinition.metadata.type,
        config,
        inputData
      );

      logs.push(`Simulated execution for node type: ${nodeDefinition.metadata.type}`);

      return {
        output: simulatedOutput,
        logs,
        duration: Date.now() - startTime,
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        output: {},
        logs: [...logs, `Error: ${errorMessage}`],
        duration: Date.now() - startTime,
        success: false,
        error: {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }

  private simulateNodeExecution(
    nodeType: string,
    config: Record<string, unknown>,
    inputData: Record<string, unknown>
  ): unknown {
    // Simulate different node types
    switch (nodeType) {
      case "entry":
        return inputData;

      case "http-request":
        return {
          status: 200,
          headers: {},
          body: { message: "Simulated HTTP response" }
        };

      case "kv-get":
        return {
          value: `Simulated KV value for key: ${config.key || "unknown"}`,
          metadata: {}
        };

      case "kv-put":
        return {
          success: true,
          key: config.key || "unknown"
        };

      case "d1-query":
        return {
          results: [],
          success: true,
          meta: {}
        };

      case "transform":
        return {
          transformed: inputData
        };

      case "sleep":
        return {
          slept: config.duration || 1000
        };

      case "validate":
        return {
          valid: true,
          errors: []
        };

      default:
        return {
          message: `Simulated output for ${nodeType}`,
          config,
          input: inputData
        };
    }
  }
}

