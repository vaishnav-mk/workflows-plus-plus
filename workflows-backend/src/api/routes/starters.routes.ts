/**
 * Workflow Starters Routes
 * API endpoints for workflow templates/starters
 */

import { Hono } from "hono";
import { 
  getWorkflowStarters, 
  getWorkflowStarterById, 
  getStarterCategories 
} from "../../services/starters/workflow-starters";
import { ApiResponse } from "../../core/api-contracts";
import { HTTP_STATUS_CODES } from "../../core/constants";
import { logger } from "../../core/logging/logger";

const app = new Hono();

/**
 * GET /starters
 * Get all workflow starters with optional filters
 */
app.get("/", async (c) => {
  try {
    const category = c.req.query("category");
    const difficulty = c.req.query("difficulty");
    const tagsParam = c.req.query("tags");
    const tags = tagsParam ? tagsParam.split(",") : undefined;
    
    const starters = getWorkflowStarters({
      category,
      difficulty,
      tags
    });
    
    const response: ApiResponse<typeof starters> = {
      success: true,
      data: starters,
      message: "Workflow starters retrieved successfully"
    };
    
    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error(`Failed to get workflow starters: ${error instanceof Error ? error.message : "Unknown error"}`);
    
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: "Failed to retrieve workflow starters",
      error: error instanceof Error ? error.message : "Unknown error"
    };
    
    return c.json(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /starters/categories
 * Get all available starter categories
 */
app.get("/categories", async (c) => {
  try {
    const categories = getStarterCategories();
    
    const response: ApiResponse<typeof categories> = {
      success: true,
      data: categories,
      message: "Starter categories retrieved successfully"
    };
    
    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error(`Failed to get starter categories: ${error instanceof Error ? error.message : "Unknown error"}`);
    
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: "Failed to retrieve starter categories",
      error: error instanceof Error ? error.message : "Unknown error"
    };
    
    return c.json(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /starters/:id
 * Get a specific workflow starter by ID
 */
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const starter = getWorkflowStarterById(id);
    
    if (!starter) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: `Workflow starter '${id}' not found`
      };
      
      return c.json(response, HTTP_STATUS_CODES.NOT_FOUND);
    }
    
    const response: ApiResponse<typeof starter> = {
      success: true,
      data: starter,
      message: "Workflow starter retrieved successfully"
    };
    
    return c.json(response, HTTP_STATUS_CODES.OK);
  } catch (error) {
    logger.error(`Failed to get workflow starter ${c.req.param("id")}: ${error instanceof Error ? error.message : "Unknown error"}`);
    
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: "Failed to retrieve workflow starter",
      error: error instanceof Error ? error.message : "Unknown error"
    };
    
    return c.json(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
});

export default app;

