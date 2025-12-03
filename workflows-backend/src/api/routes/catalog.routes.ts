/**
 * Catalog Routes
 */

import { Hono } from "hono";
import { zodToJsonSchema } from "zod-to-json-schema";
import { NodeRegistry } from "../../catalog/registry";
import { NodeCategory } from "../../core/enums";
import { HTTP_STATUS_CODES } from "../../core/constants";
import { validateParams, validateQuery, validationErrorResponse } from "../../core/validation/validator";
import { NodeTypeParamSchema, CategoryQuerySchema } from "../../core/validation/schemas";

const app = new Hono();

// Get catalog JSON (lightweight)
app.get("/", async (c) => {
  try {
    const json = NodeRegistry.getCatalogJSON();
    return c.json(JSON.parse(json), HTTP_STATUS_CODES.OK);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to retrieve catalog",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Get full catalog
app.get("/full", async (c) => {
  try {
    const catalog = NodeRegistry.getCatalog();
    return c.json(
      {
        success: true,
        data: catalog,
        message: "Catalog retrieved successfully",
      },
      HTTP_STATUS_CODES.OK
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to retrieve catalog",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Get node by type
app.get("/:nodeType", async (c) => {
  try {
    // Validate path parameters
    const paramsValidation = validateParams(c, NodeTypeParamSchema);
    if (!paramsValidation.success) {
      return validationErrorResponse(paramsValidation);
    }
    
    const { nodeType } = paramsValidation.data;

    const node = NodeRegistry.getNode(nodeType);
    if (!node) {
      return c.json(
        {
          success: false,
          error: "Node not found",
          message: `Node type '${nodeType}' not found`,
        },
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }

    // Convert Zod schema to JSON Schema for frontend
    const jsonSchema = zodToJsonSchema(node.configSchema, {
      target: "openApi3",
      $refStrategy: "none",
    });

    // Return node with converted schema
    return c.json(
      {
        success: true,
        data: {
          ...node,
          configSchema: jsonSchema,
        },
        message: "Node retrieved successfully",
      },
      HTTP_STATUS_CODES.OK
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to retrieve node",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

// Get nodes by category
app.get("/categories", async (c) => {
  try {
    // Validate query parameters
    const queryValidation = validateQuery(c, CategoryQuerySchema);
    if (!queryValidation.success) {
      return validationErrorResponse(queryValidation);
    }
    
    const { category } = queryValidation.data;

    const categoryEnum = category.toUpperCase() as NodeCategory;
    const nodes = NodeRegistry.getNodesByCategory(categoryEnum);

    return c.json(
      {
        success: true,
        data: nodes,
        message: "Nodes retrieved successfully",
      },
      HTTP_STATUS_CODES.OK
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to retrieve nodes",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});

export default app;
