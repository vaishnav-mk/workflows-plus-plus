/**
 * HTTP Request Node - Make external API calls
 */

import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenContext, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";
import { DEFAULT_VALUES, TEMPLATE_PATTERNS } from "../../core/constants";

const HttpRequestConfigSchema = z.object({
  url: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"),
  headers: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
  body: z.object({
    type: z.enum(["none", "json", "text", "form"]),
    content: z.any(),
  }).default({ type: "none", content: "" }),
  timeout: z.number().min(1000).max(300000).default(DEFAULT_VALUES.TIMEOUT),
});

type HttpRequestConfig = z.infer<typeof HttpRequestConfigSchema>;

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

export const HttpRequestNode: WorkflowNodeDefinition<HttpRequestConfig> = {
  metadata: {
    type: NodeType.HTTP_REQUEST,
    name: "HTTP Request",
    description: "Make external API calls",
    category: NodeCategory.HTTP,
    version: "1.0.0",
    icon: "Globe",
    color: "#3B82F6",
    tags: ["api", "rest", "http"],
  },
  configSchema: HttpRequestConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Trigger request",
      required: true,
    },
  ],
  outputPorts: [
    {
      id: "response",
      label: "Response",
      type: DataType.OBJECT,
      description: "HTTP response",
      required: false,
    },
    {
      id: "body",
      label: "Body",
      type: DataType.ANY,
      description: "Response body",
      required: false,
    },
    {
      id: "status",
      label: "Status",
      type: DataType.NUMBER,
      description: "Status code",
      required: false,
    },
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
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
      name: "GET Request",
      description: "Fetch data from API",
      config: { url: "https://api.example.com/users", method: "GET", headers: [] },
    },
    {
      name: "POST with JSON",
      description: "Create a resource",
      config: {
        url: "https://api.jolpi.ca/ergast/f1/current/driverStandings.json",
        method: "GET",
        headers: [{ key: "Content-Type", value: "application/json" }],
        body: { type: "json", content: { name: "John" } },
      },
    },
  ],
  presetOutput: {
    status: 200,
    headers: { "content-type": "application/json" },
    body: { id: 1, name: "Example", data: {} },
    message: "HTTP request completed successfully",
  },
  codegen: ({ nodeId, config, stepName, graphContext }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      // Validate and provide defaults for config
      if (!config || typeof config !== 'object') {
        return yield* _(Effect.fail({
          _tag: ErrorCode.COMPILATION_ERROR,
          message: `Invalid config for HTTP request node ${nodeId}`,
        }));
      }

      // Ensure url exists
      if (!config.url) {
        return yield* _(Effect.fail({
          _tag: ErrorCode.COMPILATION_ERROR,
          message: `Missing URL for HTTP request node ${nodeId}`,
        }));
      }

      let url = config.url;
      if (typeof url === "string" && url.includes("{{")) {
        url = resolveTemplateExpression(url, graphContext);
      } else {
        url = JSON.stringify(url);
      }

      let headersString = "";
      if (config.headers && Array.isArray(config.headers) && config.headers.length > 0) {
        headersString = config.headers
          .filter(h => h && h.key && h.value) // Filter out invalid headers
          .map(h => {
            let headerValue = h.value;
            if (typeof headerValue === "string" && headerValue.includes("{{")) {
              headerValue = resolveTemplateExpression(headerValue, graphContext);
            } else {
              headerValue = JSON.stringify(headerValue);
            }
            return `        '${h.key}': ${headerValue}`;
          }).join(",\n");
      }

      let bodyContent = "";
      // Ensure body exists and has a type property, default to "none" if missing
      const body = config.body || { type: "none", content: "" };
      if (body.type && body.type !== "none") {
        if (typeof body.content === "string" && body.content.includes("{{")) {
          const resolvedContent = resolveTemplateExpression(body.content, graphContext);
          if (body.type === "json") {
            bodyContent = `body: JSON.stringify(${resolvedContent}),`;
          } else if (body.type === "text") {
            bodyContent = `body: ${resolvedContent},`;
          } else {
            bodyContent = `body: new URLSearchParams(${resolvedContent}),`;
          }
        } else {
          if (body.type === "json") {
            bodyContent = `body: JSON.stringify(${JSON.stringify(body.content)}),`;
          } else if (body.type === "text") {
            bodyContent = `body: ${JSON.stringify(body.content)},`;
          } else {
            bodyContent = `body: new URLSearchParams(${JSON.stringify(body.content)}),`;
          }
        }
      }

      const inputData = graphContext.edges
        .filter(e => e.target === nodeId)
        .map(e => `_workflowState['${e.source}']?.output || event.payload`)[0] || "event.payload";

      // Ensure method and timeout have defaults
      const method = config.method || "GET";
      const timeout = config.timeout || DEFAULT_VALUES.TIMEOUT;

      const code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      const response = await fetch(${url}, {
        method: '${method}',
        headers: {
${headersString || "          // No custom headers"}
        },
        ${bodyContent}
        signal: AbortSignal.timeout(${timeout})
      });
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }
      const body = await response.json();
      const result = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: body,
        message: 'HTTP request completed successfully'
      };
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: result
      };
      return result;
    });`;

      return {
        code,
        requiredBindings: [],
      };
    });
  },
};

