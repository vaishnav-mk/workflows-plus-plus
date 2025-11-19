import { Context } from "hono";
import { WorkerService } from "../services/workerService";
import { ApiResponse } from "../types/api";

export class WorkerController {
  constructor(private workerService: WorkerService) {}

  async listWorkers(c: Context): Promise<Response> {
    try {
      const page = parseInt(c.req.query("page") || "1");
      const per_page = parseInt(c.req.query("per_page") || "10");

      const result = await this.workerService.listWorkers({ page, per_page });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: "Workers retrieved successfully"
      };

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to list workers",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }

  async getWorker(c: Context): Promise<Response> {
    try {
      const workerId = c.req.param("id");
      if (!workerId) {
        return c.json({ success: false, error: "Worker ID is required" }, 400);
      }

      const worker = await this.workerService.getWorker(workerId);

      const response: ApiResponse = {
        success: true,
        data: worker,
        message: "Worker retrieved successfully"
      };

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to get worker",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }
}
