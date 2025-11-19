import { Context } from "hono";
import Cloudflare from "cloudflare";
import { ApiResponse } from "../types/api";

export class InstanceController {
  private client: Cloudflare;

  constructor(private env: any) {
    this.client = new Cloudflare({
      apiToken: env.CF_API_TOKEN
    });
  }

  async listInstances(c: Context): Promise<Response> {
    try {
      const workflowName = c.req.param("workflowName");
      if (!workflowName) {
        return c.json(
          { success: false, error: "Workflow name is required" },
          400
        );
      }

      const page = parseInt(c.req.query("page") || "1");
      const perPage = parseInt(c.req.query("per_page") || "10");

      const instances = await this.client.workflows.instances.list(
        workflowName,
        {
          account_id: this.env.CF_ACCOUNT_ID,
          page,
          per_page: perPage
        }
      );

      const response: ApiResponse = {
        success: true,
        data: instances.result || [],
        message: "Instances retrieved successfully",
        pagination: {
          page,
          per_page: perPage,
          total: (instances.result || []).length,
          total_pages: Math.ceil((instances.result || []).length / perPage)
        }
      };

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to list instances",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }

  async getInstance(c: Context): Promise<Response> {
    try {
      const workflowName = c.req.param("workflowName");
      const instanceId = c.req.param("instanceId");

      if (!workflowName || !instanceId) {
        return c.json(
          {
            success: false,
            error: "Workflow name and instance ID are required"
          },
          400
        );
      }

      const instance = await this.client.workflows.instances.get(
        workflowName,
        instanceId,
        {
          account_id: this.env.CF_ACCOUNT_ID
        }
      );

      const response: ApiResponse = {
        success: true,
        data: instance,
        message: "Instance retrieved successfully"
      };

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to get instance",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }
}
