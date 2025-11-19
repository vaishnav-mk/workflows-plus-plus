import { Context } from "hono";
import { NodeRegistry } from "../nodes/registry";
import { NodeExecutionService } from "../services/nodeExecutionService";
import { ApiResponse } from "../types/api";

export class NodeController {
  private executionService: NodeExecutionService;

  constructor() {
    this.executionService = new NodeExecutionService();
  }

  async getNodeRegistry(c: Context): Promise<Response> {
    try {
      const registry = NodeRegistry.toJSON();

      const response: ApiResponse = {
        success: true,
        data: registry,
        message: "Node registry retrieved successfully"
      };

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to fetch node registry",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }

  async executeNode(c: Context): Promise<Response> {
    try {
      const body = await c.req.json();
      const { type, config, inputData } = body;

      if (!type) {
        return c.json(
          {
            success: false,
            error: "Node type is required"
          },
          400
        );
      }

      const result = await this.executionService.execute({
        type,
        config: config || {},
        inputData: inputData || {}
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: "Node execution completed"
      };

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to execute node",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }

  async validateNodeConfig(c: Context): Promise<Response> {
    try {
      const { type, config } = await c.req.json();
      const nodeDefinition = NodeRegistry.getNodeByType(type);

      if (!nodeDefinition) {
        return c.json({ success: false, error: "Node not found" }, 404);
      }

      const result = nodeDefinition.configSchema.safeParse(config);

      return c.json({
        success: true,
        data: {
          valid: result.success,
          errors: result.success
            ? []
            : result.error.errors.map((e: any) => ({
                path: e.path.join("."),
                message: e.message
              }))
        }
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to validate node config",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }
}
