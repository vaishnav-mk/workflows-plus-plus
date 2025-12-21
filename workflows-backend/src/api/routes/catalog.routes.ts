import { Hono } from "hono";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { NodeRegistry } from "../../catalog/registry";
import { NodeCategory } from "../../core/enums";
import { HTTP_STATUS_CODES } from "../../core/constants";
import {
  NodeTypeParamSchema,
  CategoryQuerySchema
} from "../../core/validation/schemas";
import {
  createSuccessResponse,
  createErrorResponse,
  safe
} from "../../core/utils/route-helpers";
import { zValidator } from "../../api/middleware/validation.middleware";

const app = new Hono();

app.get(
  "/",
  safe(async c => {
    try {
      const json = NodeRegistry.getCatalogJSON();
      const catalog = JSON.parse(json);
      return c.json(
        createSuccessResponse(catalog, "Catalog retrieved successfully"),
        HTTP_STATUS_CODES.OK
      );
    } catch (error) {
      throw error;
    }
  })
);

app.get(
  "/full",
  safe(async c => {
    const catalog = NodeRegistry.getCatalog();
    return c.json(
      createSuccessResponse(catalog, "Catalog retrieved successfully"),
      HTTP_STATUS_CODES.OK
    );
  })
);

app.get(
  "/:nodeType",
  zValidator("param", NodeTypeParamSchema),
  safe(async c => {
    const { nodeType } = c.req.valid("param") as z.infer<
      typeof NodeTypeParamSchema
    >;
    const node = NodeRegistry.getNode(nodeType);

    if (!node) {
      return c.json(
        createErrorResponse(
          `Node type '${nodeType}' not found`,
          "Node Not Found"
        ),
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }

    const jsonSchema = zodToJsonSchema(node.configSchema, {
      target: "openApi3",
      $refStrategy: "none"
    });

    return c.json(
      createSuccessResponse(
        {
          ...node,
          configSchema: jsonSchema
        },
        "Node retrieved successfully"
      ),
      HTTP_STATUS_CODES.OK
    );
  })
);

app.get(
  "/categories",
  zValidator("query", CategoryQuerySchema),
  safe(async c => {
    const { category } = c.req.valid("query") as z.infer<
      typeof CategoryQuerySchema
    >;
    const categoryUpper = category.toUpperCase();
    const validCategories = Object.values(NodeCategory);

    if (!validCategories.includes(categoryUpper as NodeCategory)) {
      return c.json(
        createErrorResponse(
          `Category '${category}' is not valid. Valid categories: ${validCategories.join(
            ", "
          )}`,
          "Invalid Category"
        ),
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }

    const nodes = NodeRegistry.getNodesByCategory(
      categoryUpper as NodeCategory
    );
    return c.json(
      createSuccessResponse(nodes, "Nodes retrieved successfully"),
      HTTP_STATUS_CODES.OK
    );
  })
);

export default app;
