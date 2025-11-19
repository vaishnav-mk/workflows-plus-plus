import { Context } from "hono";
import { VersionService } from "../services/versionService";
import { ApiResponse } from "../types/api";

export class VersionController {
  constructor(private versionService: VersionService) {}

  async listVersions(c: Context): Promise<Response> {
    try {
      const workerId = c.req.param("workerId");
      if (!workerId) {
        return c.json({ success: false, error: "Worker ID is required" }, 400);
      }

      const page = parseInt(c.req.query("page") || "1");
      const per_page = parseInt(c.req.query("per_page") || "10");

      const result = await this.versionService.listVersions(workerId, {
        page,
        per_page
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: "Versions retrieved successfully"
      };

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to list versions",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }

  async getVersion(c: Context): Promise<Response> {
    try {
      const workerId = c.req.param("workerId");
      const versionId = c.req.param("versionId");

      if (!workerId || !versionId) {
        return c.json(
          { success: false, error: "Worker ID and Version ID are required" },
          400
        );
      }

      const include = c.req.query("include");

      const version = await this.versionService.getVersion(
        workerId,
        versionId,
        { include }
      );

      const response: ApiResponse = {
        success: true,
        data: version,
        message: "Version retrieved successfully"
      };

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to get version",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }
}
