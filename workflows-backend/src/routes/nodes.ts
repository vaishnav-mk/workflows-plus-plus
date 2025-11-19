import { Hono } from "hono";
import { NodeController } from "../controllers/nodeController";

const createNodeController = () => {
  return new NodeController();
};

export const createNodeRoutes = () => {
  const app = new Hono();

  app.get("/", c => {
    const controller = createNodeController();
    return controller.getNodeRegistry(c);
  });

  app.post("/execute", async c => {
    const controller = createNodeController();
    return controller.executeNode(c);
  });

  app.post("/validate", async c => {
    const controller = createNodeController();
    return controller.validateNodeConfig(c);
  });

  return app;
};
