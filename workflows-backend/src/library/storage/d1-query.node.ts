/**
 * D1 Query Node - Execute SQL queries on D1 database
 */

import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenContext, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, BindingType, ErrorCode } from "../../core/enums";
import { BINDING_NAMES, TEMPLATE_PATTERNS } from "../../core/constants";

const D1QueryConfigSchema = z.object({
  database: z.string().default(BINDING_NAMES.DEFAULT_D1).describe("binding:d1"),
  database_id: z.string().uuid().optional().describe("D1 database UUID"),
  query: z.string().min(1),
  params: z.array(z.object({ value: z.any() })).default([]),
  returnType: z.enum(["all", "first", "run"]).default("all"),
});

type D1QueryConfig = z.infer<typeof D1QueryConfigSchema>;

function resolveTemplateExpression(
  expr: string,
  graphContext: CodeGenContext["graphContext"]
): string {
  return expr.replace(TEMPLATE_PATTERNS.TEMPLATE_REGEX, (_match, innerExpr) => {
    const trimmed = innerExpr.trim();
    if (trimmed.startsWith(TEMPLATE_PATTERNS.STATE_PREFIX)) {
      const path = trimmed.substring(TEMPLATE_PATTERNS.STATE_PREFIX.length);
      const [nodeId, ...rest] = path.split(TEMPLATE_PATTERNS.PATH_SEPARATOR);
      const tail = rest.length ? "." + rest.join(".") : ".output";
      return `_workflowState['${nodeId}']${tail}`;
    }
    const [nodeRef, ...rest] = trimmed.split(TEMPLATE_PATTERNS.PATH_SEPARATOR);
    const stepName = graphContext.stepNameMap.get(nodeRef);
    if (stepName) {
      const tail = rest.length ? "." + rest.join(".") : "";
      return `_workflowResults.${stepName}${tail}`;
    }
    const tail = rest.length ? "." + rest.join(".") : ".output";
    return `_workflowState['${nodeRef}']${tail}`;
  });
}

export const D1QueryNode: WorkflowNodeDefinition<D1QueryConfig> = {
  metadata: {
    type: NodeType.D1_QUERY,
    name: "D1 Query",
    description: "Execute SQL queries on D1 database",
    category: NodeCategory.DATABASE,
    version: "1.0.0",
    icon: "Database",
    color: "#3B82F6",
    tags: ["d1", "database", "sql"],
  },
  configSchema: D1QueryConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Trigger query",
      required: true,
    },
  ],
  outputPorts: [
    {
      id: "results",
      label: "Results",
      type: DataType.ARRAY,
      description: "Query results",
      required: false,
    },
    {
      id: "meta",
      label: "Metadata",
      type: DataType.OBJECT,
      description: "Query metadata",
      required: false,
    },
    {
      id: "success",
      label: "Success",
      type: DataType.BOOLEAN,
      description: "Query executed",
      required: false,
    },
  ],
  bindings: [
    {
      type: BindingType.D1,
      name: BINDING_NAMES.DEFAULT_D1,
      required: true,
      description: "D1 database binding",
    },
  ],
  capabilities: {
    playgroundCompatible: false,
    supportsRetry: true,
    isAsync: true,
    canFail: true,
  },
  validation: {
    rules: [],
    errorMessages: {},
  },
  examples: [
    {
      name: "Select Users",
      description: "Query users table",
      config: { database: "DB", query: "SELECT * FROM users WHERE age > ?", params: [{ value: 18 }], returnType: "all" },
    },
  ],
  presetOutput: {
    results: [{ id: 1, name: "John", age: 25 }],
    meta: { changes: 0, duration: 5 },
    success: true,
    message: "D1 query executed successfully",
  },
  codegen: ({ nodeId, config, stepName, graphContext }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const db = (config.database || BINDING_NAMES.DEFAULT_D1).replace(/[^a-zA-Z0-9_]/g, "_");
      
      let query = config.query;
      if (typeof query === "string" && query.includes("{{")) {
        query = resolveTemplateExpression(query, graphContext);
      } else {
        query = JSON.stringify(query);
      }

      let paramsBinding = "";
      if (config.params && config.params.length > 0) {
        paramsBinding = config.params.map(p => {
          let paramValue = p.value;
          if (typeof paramValue === "string" && paramValue.includes("{{")) {
            paramValue = resolveTemplateExpression(paramValue, graphContext);
          } else {
            paramValue = JSON.stringify(paramValue);
          }
          return `.bind(${paramValue})`;
        }).join("");
      }

      const inputData = graphContext.edges
        .filter(e => e.target === nodeId)
        .map(e => `_workflowState['${e.source}']?.output || event.payload`)[0] || "event.payload";

      const returnMethod = config.returnType === "all" ? "all()" : config.returnType === "first" ? "first()" : "run()";

      const code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      try {
        const stmt = this.env["${db}"].prepare(${query});
        const result = await stmt${paramsBinding}.${returnMethod};
        const output = { results: JSON.stringify(result.results || result), meta: JSON.stringify(result.meta || {}), success: result.success !== false, message: 'D1 query executed successfully' };
        _workflowState['${nodeId}'] = {
          input: inputData,
          output: output
        };
        return output;
      } catch (error) {
        const output = { results: '[]', meta: '{}', success: false, error: error instanceof Error ? error.message : String(error), message: 'D1 query failed - table may not exist' };
        _workflowState['${nodeId}'] = {
          input: inputData,
          output: output
        };
        return output;
      }
    });`;

      return {
        code,
        requiredBindings: [{ name: db, type: BindingType.D1 }],
      };
    });
  },
};



