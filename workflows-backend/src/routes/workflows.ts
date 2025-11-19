import { Hono } from "hono";
import { CloudflareWorkflowController } from "../controllers/cloudflareWorkflowController";
import { WorkflowController } from "../controllers/workflowController";
import { AIWorkflowController } from "../controllers/aiWorkflowController";
import { WorkflowService } from "../services/workflowService";
import { ValidationService } from "../services/validationService";
import { CodegenService } from "../services/codegenService";
import { validateJson, validateWorkflowId } from "../middleware/validation";
import { Env } from "../types/env";

const createWorkflowController = (env: Env) => {
  const workflowService = new WorkflowService(env);
  const validationService = new ValidationService();
  const codegenService = new CodegenService();

  return new WorkflowController(
    workflowService,
    validationService,
    codegenService
  );
};

export const createWorkflowRoutes = () => {
  const app = new Hono<{ Bindings: Env }>();

  app.use("*", validateJson);

  app.get("/", async c => {
    const controller = new CloudflareWorkflowController(c.env);
    return controller.getAllWorkflows(c);
  });

  app.post("/", async c => {
    const controller = createWorkflowController(c.env);
    return controller.createWorkflow(c);
  });

  app.post("/validate", async c => {
    const controller = createWorkflowController(c.env);
    return controller.validateWorkflow(c);
  });

  app.post("/preview", async c => {
    const controller = createWorkflowController(c.env);
    return controller.generateCode(c);
  });

  app.post("/generate", async c => {
    const controller = new AIWorkflowController(c.env);
    return controller.generateWorkflow(c);
  });

  app.post("/:id/deploy", validateWorkflowId, async c => {
    const controller = createWorkflowController(c.env);
    return controller.deployWorkflow(c);
  });

  return app;
};
