import { z } from "zod";

const D1QueryConfigSchema = z.object({
  database: z.string().default("DB"),
  query: z.string(),
  params: z.array(z.object({ value: z.any() })).default([]),
  returnType: z.enum(["all", "first", "run"]).default("all")
});

export const D1QueryNode = {
  metadata: {
    type: "d1-query",
    name: "D1 Query",
    description: "Execute SQL queries on D1 database",
    category: "database" as const,
    version: "1.0.0",
    icon: "Database",
    color: "#3B82F6",
    tags: ["d1", "database", "sql"]
  },
  configSchema: D1QueryConfigSchema,
  inputPorts: [
    { id: "trigger", label: "Execute", type: "any" as const, description: "Trigger query", required: true }
  ],
  outputPorts: [
    { id: "results", label: "Results", type: "array" as const, description: "Query results", required: false },
    { id: "meta", label: "Metadata", type: "object" as const, description: "Query metadata", required: false },
    { id: "success", label: "Success", type: "boolean" as const, description: "Query executed", required: false }
  ],
  bindings: [
    {
      type: "D1",
      name: "DB",
      required: true,
      description: "D1 database binding"
    }
  ],
  capabilities: {
    playgroundCompatible: false,
    supportsRetry: true,
    isAsync: true,
    canFail: true
  },
  validation: {
    rules: [],
    errorMessages: {}
  },
  examples: [
    {
      name: "Select Users",
      description: "Query users table",
      config: { database: "DB", query: "SELECT * FROM users WHERE age > ?", params: [{ value: 18 }], returnType: "all" }
    }
  ],
  presetOutput: {
    results: [{ id: 1, name: "John", age: 25 }],
    meta: { changes: 0, duration: 5 },
    success: true,
    message: 'D1 query executed successfully'
  }
};

