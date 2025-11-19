import { Hono } from "hono";
import { VersionController } from "../controllers/versionController";
import { VersionService } from "../services/versionService";
import { validateJson } from "../middleware/validation";
import { Env } from "../types/env";

const createVersionController = (env: Env) => {
  const versionService = new VersionService(env);

  return new VersionController(versionService);
};

export const createVersionRoutes = () => {
  const app = new Hono<{ Bindings: Env }>();

  app.use("*", validateJson);

  app.get("/:workerId/versions", async c => {
    const controller = createVersionController(c.env);
    return controller.listVersions(c);
  });

  app.get("/:workerId/versions/:versionId", async c => {
    const controller = createVersionController(c.env);
    return controller.getVersion(c);
  });

  return app;
};
