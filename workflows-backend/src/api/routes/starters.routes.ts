import { Hono } from "hono";
import { 
  getWorkflowStarters, 
  getWorkflowStarterById, 
  getStarterCategories 
} from "../../services/starters";
import { HTTP_STATUS_CODES } from "../../core/constants";
import { createSuccessResponse, createErrorResponse, safe } from "../../core/utils/route-helpers";
import { z } from "zod";
import { zValidator } from "../../api/middleware/validation.middleware";

const app = new Hono();

const StarterQuerySchema = z.object({
  category: z.string().optional(),
  difficulty: z.string().optional(),
  tags: z.string().optional()
});

const StarterIdParamSchema = z.object({
  id: z.string().min(1)
});

app.get("/", zValidator('query', StarterQuerySchema), safe(async (c) => {
  const { category, difficulty, tags: tagsParam } = c.req.valid('query') as z.infer<typeof StarterQuerySchema>;
  const tags = tagsParam ? tagsParam.split(",") : undefined;
  
  const starters = getWorkflowStarters({ category, difficulty, tags });
  return c.json(createSuccessResponse(starters, "Workflow starters retrieved successfully"));
}));

app.get("/categories", safe(async (c) => {
  const categories = getStarterCategories();
  return c.json(createSuccessResponse(categories, "Starter categories retrieved successfully"));
}));

app.get("/:id", zValidator('param', StarterIdParamSchema), safe(async (c) => {
  const { id } = c.req.valid('param') as z.infer<typeof StarterIdParamSchema>;
  const starter = getWorkflowStarterById(id);
  
  if (!starter) {
    return c.json(createErrorResponse(`Workflow starter '${id}' not found`, "Not Found"), HTTP_STATUS_CODES.NOT_FOUND);
  }
  
  return c.json(createSuccessResponse(starter, "Workflow starter retrieved successfully"));
}));

export default app;
