/**
 * Browser Extract Node - Extract data from webpages (JSON, links, scrape)
 */

import { z } from "zod";
import { Effect } from "effect";
import {
  WorkflowNodeDefinition,
  CodeGenContext,
  CodeGenResult
} from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";
import { TEMPLATE_PATTERNS } from "../../core/constants";

const BrowserExtractConfigSchema = z
  .object({
    operation: z.enum(["json", "links", "scrape"]).default("json"),
    url: z.string().url().optional(),
    html: z.string().min(1).optional(),
    // JSON extraction options
    prompt: z.string().optional(),
    responseFormat: z
      .object({
        type: z.string(),
        schema: z.record(z.any()).optional()
      })
      .optional(),
    // Scrape options
    selectors: z.array(z.string()).optional(),
    // Common options
    viewport: z
      .object({
        width: z.number().default(1920),
        height: z.number().default(1080)
      })
      .optional(),
    waitForTimeout: z.number().min(0).max(120000).optional(),
    waitForSelector: z
      .object({
        selector: z.string(),
        timeout: z.number().optional()
      })
      .optional(),
    scrollToBottom: z.boolean().default(false),
    gotoOptions: z
      .object({
        waitUntil: z
          .enum([
            "load",
            "domcontentloaded",
            "networkidle0",
            "networkidle2",
            "commit"
          ])
          .optional()
      })
      .optional()
  })
  .refine(data => data.url || data.html, {
    message: "Either 'url' or 'html' must be provided",
    path: ["url", "html"]
  })
  .refine(
    data => {
      if (data.operation === "json") {
        return !!(data.prompt || data.responseFormat);
      }
      if (data.operation === "scrape") {
        return !!(data.selectors && data.selectors.length > 0);
      }
      return true;
    },
    {
      message:
        "JSON operation requires 'prompt' or 'responseFormat', scrape requires 'selectors'",
      path: ["operation"]
    }
  );

type BrowserExtractConfig = z.infer<typeof BrowserExtractConfigSchema>;

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

export const BrowserExtractNode: WorkflowNodeDefinition<
  BrowserExtractConfig
> = {
  metadata: {
    type: NodeType.BROWSER_EXTRACT,
    name: "Browser Extract",
    description: "Extract data from webpages (JSON, links, scrape elements)",
    category: NodeCategory.HTTP,
    version: "1.0.0",
    icon: "FileSearch",
    color: "#10B981",
    tags: ["browser", "extract", "scrape", "json"]
  },
  configSchema: BrowserExtractConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Trigger extraction",
      required: true
    }
  ],
  outputPorts: [
    {
      id: "result",
      label: "Result",
      type: DataType.ANY,
      description:
        "Extracted data (JSON object, links array, or scraped elements)",
      required: false
    },
    {
      id: "status",
      label: "Status",
      type: DataType.BOOLEAN,
      description: "Operation status",
      required: false
    }
  ],
  bindings: [],
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
      name: "Extract JSON",
      description: "Extract structured data using AI",
      config: {
        operation: "json",
        url: "https://example.com",
        prompt: "Extract the main title and description",
        responseFormat: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" }
            }
          }
        }
      }
    },
    {
      name: "Extract Links",
      description: "Get all links from a page",
      config: {
        operation: "links",
        url: "https://example.com"
      }
    }
  ],
  presetOutput: {
    status: true,
    result: { title: "Example", description: "Example description" }
  },
  codegen: ({
    nodeId,
    config,
    stepName,
    graphContext
  }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function*(_) {
      if (!config || typeof config !== "object") {
        return yield* _(
          Effect.fail({
            _tag: ErrorCode.COMPILATION_ERROR,
            message: `Invalid config for browser extract node ${nodeId}`
          })
        );
      }

      if (!config.url && !config.html) {
        return yield* _(
          Effect.fail({
            _tag: ErrorCode.COMPILATION_ERROR,
            message: `Either 'url' or 'html' must be provided for browser extract node ${nodeId}`
          })
        );
      }

      const operation = config.operation || "json";

      let urlExpr = "";
      if (config.url) {
        if (typeof config.url === "string" && config.url.includes("{{")) {
          urlExpr = resolveTemplateExpression(config.url, graphContext);
        } else {
          urlExpr = JSON.stringify(config.url);
        }
      }

      let htmlExpr = "";
      if (config.html) {
        if (typeof config.html === "string" && config.html.includes("{{")) {
          htmlExpr = resolveTemplateExpression(config.html, graphContext);
        } else {
          htmlExpr = JSON.stringify(config.html);
        }
      }

      // Build request body with proper template resolution
      const requestBodyParts: string[] = [];

      if (urlExpr) {
        requestBodyParts.push(`url: ${urlExpr}`);
      }
      if (htmlExpr) {
        requestBodyParts.push(`html: ${htmlExpr}`);
      }

      if (config.viewport) {
        requestBodyParts.push(`viewport: ${JSON.stringify(config.viewport)}`);
      }
      if (config.waitForTimeout !== undefined) {
        requestBodyParts.push(`waitForTimeout: ${config.waitForTimeout}`);
      }
      if (config.waitForSelector) {
        requestBodyParts.push(
          `waitForSelector: ${JSON.stringify(config.waitForSelector)}`
        );
      }
      if (config.scrollToBottom) {
        requestBodyParts.push(`addScriptTag: [{
          content: \`(async()=>{for(let i=0;i<3;i++){window.scrollTo(0,document.body.scrollHeight);await new Promise(r=>setTimeout(r,1500));}})();\`
        }]`);
      }
      if (config.gotoOptions) {
        requestBodyParts.push(
          `gotoOptions: ${JSON.stringify(config.gotoOptions)}`
        );
      }

      // Operation-specific options
      if (operation === "json") {
        if (config.prompt) {
          requestBodyParts.push(`prompt: ${JSON.stringify(config.prompt)}`);
        }
        if (config.responseFormat) {
          requestBodyParts.push(
            `response_format: ${JSON.stringify(config.responseFormat)}`
          );
        }
      } else if (operation === "scrape") {
        if (config.selectors) {
          requestBodyParts.push(
            `selectors: ${JSON.stringify(config.selectors)}`
          );
        }
      }

      const inputData =
        graphContext.edges
          .filter(e => e.target === nodeId)
          .map(
            e => `_workflowState['${e.source}']?.output || event.payload`
          )[0] || "event.payload";

      const requestBodyCode = `{${requestBodyParts.join(",\n        ")}}`;

      const code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      const accountId = this.env.CF_ACCOUNT_ID;
      const apiToken = this.env.CF_API_TOKEN;
      const apiBaseUrl = this.env.API_BASE_URL || 'https://api.cloudflare.com/client/v4';
      
      if (!accountId || !apiToken) {
        throw new Error('Cloudflare credentials (CF_ACCOUNT_ID, CF_API_TOKEN) are required for browser extraction');
      }

      const requestBody = ${requestBodyCode};

      // Call Cloudflare Browser Rendering API directly
      const apiUrl = \`\${apiBaseUrl}/accounts/\${accountId}/browser-rendering/${operation}\`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${apiToken}\`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(\`Browser extract failed: \${response.status} - \${errorText}\`);
      }

      const data = await response.json();
      const result = {
        status: data.status || data.success || true,
        result: data.result || data,
        errors: data.errors || [],
      };

      _workflowState['${nodeId}'] = {
        input: inputData,
        output: result
      };
      return result;
    });`;

      return {
        code,
        requiredBindings: []
      };
    });
  }
};
