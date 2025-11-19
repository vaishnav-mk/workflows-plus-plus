import { Hono } from "hono";
import { InstanceController } from "../controllers/instanceController";
import { Env } from "../types/env";

const createInstanceController = (env: Env) => {
  return new InstanceController(env);
};

export const createInstanceRoutes = () => {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/:workflowName/instances", async c => {
    const controller = createInstanceController(c.env);
    return controller.listInstances(c);
  });

  app.get("/:workflowName/instances/:instanceId", async c => {
    const controller = createInstanceController(c.env);
    return controller.getInstance(c);
  });

  return app;
};
