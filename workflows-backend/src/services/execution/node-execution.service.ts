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
import { DEFAULT_VALUES } from "../../core/constants";

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
      // For nodes with preset output and no special runtime, just return the preset
      if (nodeDefinition.presetOutput && nodeDefinition.metadata.type !== "http-request") {
        logs.push(`Using preset output for node type: ${nodeDefinition.metadata.type}`);
        return {
          output: nodeDefinition.presetOutput,
          logs,
          duration: Date.now() - startTime,
          success: true
        };
      }

      let output: unknown;

      // Special-case: actually execute HTTP requests for local testing
      if (nodeDefinition.metadata.type === "http-request") {
        logs.push("Executing real HTTP request for local node test");
        output = await this.executeHttpRequestNode(config, inputData, logs);
      } else {
        const simulatedOutput = this.simulateNodeExecution(
          nodeDefinition.metadata.type,
          config,
          inputData
        );

        logs.push(`Simulated execution for node type: ${nodeDefinition.metadata.type}`);
        output = simulatedOutput;
      }

      return {
        output,
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

  /**
   * Execute an HTTP Request node using the provided config.
   * This is used for local testing from the dashboard and intentionally
   * does NOT support template expressions or workflow state references.
   */
  private async executeHttpRequestNode(
    config: Record<string, unknown>,
    inputData: Record<string, unknown>,
    logs: string[]
  ): Promise<unknown> {
    const cfg = (config || {}) as {
      url?: unknown;
      method?: unknown;
      headers?: Array<{ key?: string; value?: string }> | unknown;
      body?: { type?: string; content?: unknown } | unknown;
      timeout?: unknown;
    };

    const rawUrl = cfg.url;
    if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
      throw new ExecutionError(
        ErrorCode.INVALID_CONFIG,
        "HTTP request node requires a non-empty 'url' string in config"
      );
    }

    // For now, keep things simple and disallow template expressions in local tests
    if (rawUrl.includes("{{")) {
      throw new ExecutionError(
        ErrorCode.INVALID_CONFIG,
        "Template expressions (e.g. {{state.*}}) are not supported in local HTTP tests. Please use a concrete URL."
      );
    }

    const method =
      typeof cfg.method === "string" && cfg.method.length > 0
        ? cfg.method.toUpperCase()
        : "GET";

    const timeoutMs =
      typeof cfg.timeout === "number" && Number.isFinite(cfg.timeout)
        ? cfg.timeout
        : DEFAULT_VALUES.TIMEOUT;

    const headersArray =
      Array.isArray(cfg.headers) && cfg.headers.length > 0
        ? (cfg.headers as Array<{ key?: string; value?: string }>)
        : [];

    const headers: Record<string, string> = {};
    for (const h of headersArray) {
      if (h && typeof h.key === "string" && typeof h.value === "string") {
        headers[h.key] = h.value;
      }
    }

    const bodyConfig = (cfg.body || { type: "none", content: "" }) as {
      type?: string;
      content?: unknown;
    };

    let body: BodyInit | undefined;
    if (bodyConfig.type && bodyConfig.type !== "none") {
      if (bodyConfig.type === "json") {
        body = JSON.stringify(bodyConfig.content ?? inputData);
        if (!headers["Content-Type"] && !headers["content-type"]) {
          headers["Content-Type"] = "application/json";
        }
      } else if (bodyConfig.type === "text") {
        body = String(bodyConfig.content ?? "");
      } else if (bodyConfig.type === "form") {
        const params = new URLSearchParams();
        const content = bodyConfig.content as Record<string, unknown>;
        if (content && typeof content === "object") {
          for (const [key, value] of Object.entries(content)) {
            if (value != null) {
              params.append(key, String(value));
            }
          }
        }
        body = params;
      }
    }

    logs.push(`Request: ${method} ${rawUrl}`);

    const response = await fetch(rawUrl, {
      method,
      headers,
      body,
      // Cloudflare Workers and modern runtimes support AbortSignal.timeout
      signal: AbortSignal.timeout(timeoutMs)
    });

    const responseText = await response.text();
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(responseText);
    } catch {
      parsedBody = responseText;
    }

    if (!response.ok) {
      const message = `HTTP ${response.status}: ${response.statusText}`;
      logs.push(`Error: ${message}`);
      throw new ExecutionError(ErrorCode.EXECUTION_ERROR, message);
    }

    const result = {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: parsedBody,
      message: "HTTP request completed successfully"
    };

    logs.push("HTTP request completed successfully");
    return result;
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

