import { Hono } from "hono";
import { WorkerController } from "../controllers/workerController";
import { WorkerService } from "../services/workerService";
import { validateJson } from "../middleware/validation";
import { Env } from "../types/env";

const createWorkerController = (env: Env) => {
  const workerService = new WorkerService(env);

  return new WorkerController(workerService);
};

export const createWorkerRoutes = () => {
  const app = new Hono<{ Bindings: Env }>();

  app.use("*", validateJson);

  app.get("/", async c => {
    const controller = createWorkerController(c.env);
    return controller.listWorkers(c);
  });

  app.get("/:id", async c => {
    const controller = createWorkerController(c.env);
    return controller.getWorker(c);
  });

  return app;
};
