import { Hono } from "hono";
import { HealthController } from "../controllers/healthController";

const createHealthController = () => {
  return new HealthController();
};

export const createHealthRoutes = () => {
  const app = new Hono();

  app.get("/", c => {
    const controller = createHealthController();
    return controller.healthCheck(c);
  });

  app.get("/health", c => {
    const controller = createHealthController();
    return controller.healthCheck(c);
  });

  return app;
};
