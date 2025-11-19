import { Context } from "hono";
import { HealthCheckResponse } from "../types/api";

export class HealthController {
  async healthCheck(c: Context): Promise<Response> {
    try {
      const response: HealthCheckResponse = {
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: "production",
        uptime: 0
      };

      return c.json(response);
    } catch (error) {
      const errorResponse: HealthCheckResponse = {
        status: "error",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: "production",
        uptime: 0
      };

      return c.json(errorResponse, 500);
    }
  }
}
