import { Hono } from "hono";
import { Env } from "../types/env";
import { TailService } from "../services/tailService";

const createTailService = (env: Env) => {
  return new TailService(env);
};

export const createLogStreamRoutes = () => {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/:workflowName/instances/:instanceId/logs/tail-url", async c => {
    const workflowName = c.req.param("workflowName");
    const instanceId = c.req.param("instanceId");

    try {
      const tailService = createTailService(c.env);
      const session = await tailService.startTailForWorkflow(
        workflowName,
        instanceId
      );

      if (!session) {
        return c.json(
          { success: false, error: "Failed to create tail session" },
          500
        );
      }

      return c.json({
        success: true,
        data: {
          url: session.url,
          expiresAt: session.expiresAt,
          sessionId: session.id
        }
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to create tail session",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  });

  return app;
};
