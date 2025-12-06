/**
 * Browser Render Node - Render webpages (screenshot, content, markdown, PDF, snapshot)
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

const BrowserRenderConfigSchema = z
  .object({
    operation: z
      .enum(["screenshot", "content", "markdown", "pdf", "snapshot"])
      .default("screenshot"),
    url: z.string().url().optional(),
    html: z.string().min(1).optional(),
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
    screenshotOptions: z
      .object({
        type: z.enum(["png", "jpeg"]).default("png"),
        fullPage: z.boolean().default(false),
        encoding: z.enum(["base64", "binary"]).default("base64")
      })
      .optional(),
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
  });

type BrowserRenderConfig = z.infer<typeof BrowserRenderConfigSchema>;

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

export const BrowserRenderNode: WorkflowNodeDefinition<BrowserRenderConfig> = {
  metadata: {
    type: NodeType.BROWSER_RENDER,
    name: "Browser Render",
    description:
      "Render webpages (screenshot, content, markdown, PDF, snapshot)",
    category: NodeCategory.HTTP,
    version: "1.0.0",
    icon: "Monitor",
    color: "#8B5CF6",
    tags: ["browser", "screenshot", "render", "pdf"]
  },
  configSchema: BrowserRenderConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Trigger render",
      required: true
    }
  ],
  outputPorts: [
    {
      id: "result",
      label: "Result",
      type: DataType.ANY,
      description:
        "Render result (screenshot, content, markdown, PDF, or snapshot)",
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
      name: "Take Screenshot",
      description: "Capture a screenshot of a webpage",
      config: {
        operation: "screenshot",
        url: "https://example.com",
        viewport: { width: 1920, height: 1080 },
        screenshotOptions: { type: "png", fullPage: false, encoding: "base64" }
      }
    },
    {
      name: "Get HTML Content",
      description: "Extract rendered HTML content",
      config: {
        operation: "content",
        url: "https://example.com"
      }
    }
  ],
  presetOutput: {
    status: true,
    result: "data:image/png;base64,iVBORw0KGgoAAAANS..."
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
            message: `Invalid config for browser render node ${nodeId}`
          })
        );
      }

      if (!config.url && !config.html) {
        return yield* _(
          Effect.fail({
            _tag: ErrorCode.COMPILATION_ERROR,
            message: `Either 'url' or 'html' must be provided for browser render node ${nodeId}`
          })
        );
      }

      const operation = config.operation || "screenshot";

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

      const requestBody: Record<string, unknown> = {};

      if (urlExpr) {
        requestBody.url = urlExpr;
      }
      if (htmlExpr) {
        requestBody.html = htmlExpr;
      }

      if (config.viewport) {
        requestBody.viewport = config.viewport;
      }

      if (config.waitForTimeout !== undefined) {
        requestBody.waitForTimeout = config.waitForTimeout;
      }

      if (config.waitForSelector) {
        requestBody.waitForSelector = config.waitForSelector;
      }

      if (config.scrollToBottom) {
        requestBody.addScriptTag = [
          {
            content: `(async()=>{for(let i=0;i<3;i++){window.scrollTo(0,document.body.scrollHeight);await new Promise(r=>setTimeout(r,1500));}})();`
          }
        ];
      }

      if (
        config.screenshotOptions &&
        (operation === "screenshot" || operation === "snapshot")
      ) {
        requestBody.screenshotOptions = config.screenshotOptions;
      }

      if (config.gotoOptions) {
        requestBody.gotoOptions = config.gotoOptions;
      }

      const inputData =
        graphContext.edges
          .filter(e => e.target === nodeId)
          .map(
            e => `_workflowState['${e.source}']?.output || event.payload`
          )[0] || "event.payload";

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
      if (
        config.screenshotOptions &&
        (operation === "screenshot" || operation === "snapshot")
      ) {
        requestBodyParts.push(
          `screenshotOptions: ${JSON.stringify(config.screenshotOptions)}`
        );
      }
      if (config.gotoOptions) {
        requestBodyParts.push(
          `gotoOptions: ${JSON.stringify(config.gotoOptions)}`
        );
      }

      const requestBodyCode = `{${requestBodyParts.join(",\n        ")}}`;

      const code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      const accountId = this.env.CF_ACCOUNT_ID;
      const apiToken = this.env.CF_API_TOKEN;
      const apiBaseUrl = this.env.API_BASE_URL || 'https://api.cloudflare.com/client/v4';
      
      if (!accountId || !apiToken) {
        throw new Error('Cloudflare credentials (CF_ACCOUNT_ID, CF_API_TOKEN) are required for browser rendering');
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
        throw new Error(\`Browser render failed: \${response.status} - \${errorText}\`);
      }

      let result;
      if (operation === 'pdf') {
        const arrayBuffer = await response.arrayBuffer();
        // Convert ArrayBuffer to base64 in Cloudflare Workers
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        result = {
          status: true,
          result: base64,
          contentType: 'application/pdf',
        };
      } else if (operation === 'screenshot') {
        // Screenshot can return base64 string directly
        const responseText = await response.text();
        try {
          const data = JSON.parse(responseText);
          result = {
            status: data.status || data.success || true,
            result: data.result || responseText,
            errors: data.errors || [],
          };
        } catch {
          // Not JSON - it's a data URL string
          result = {
            status: true,
            result: responseText,
          };
        }
      } else {
        const data = await response.json();
        result = {
          status: data.status || data.success || true,
          result: data.result || data,
          errors: data.errors || [],
        };
      }

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
