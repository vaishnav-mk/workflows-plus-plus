import { Context } from "hono";
import Cloudflare from "cloudflare";
import { ApiResponse } from "../types/api";

export class CloudflareWorkflowController {
  private client: Cloudflare;

  constructor(private env: any) {
    this.client = new Cloudflare({
      apiToken: env.CF_API_TOKEN
    });
  }

  async getAllWorkflows(c: Context): Promise<Response> {
    try {
      const page = parseInt(c.req.query("page") || "1");
      const perPage = parseInt(c.req.query("per_page") || "10");

      const workflows = await this.client.workflows.list({
        account_id: this.env.CF_ACCOUNT_ID,
        page,
        per_page: perPage
      });

      const response: ApiResponse = {
        success: true,
        data: workflows.result || [],
        message: "Workflows retrieved successfully",
        pagination: {
          page,
          per_page: perPage,
          total: (workflows.result || []).length,
          total_pages: Math.ceil((workflows.result || []).length / perPage)
        }
      };

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to fetch workflows",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }
}
