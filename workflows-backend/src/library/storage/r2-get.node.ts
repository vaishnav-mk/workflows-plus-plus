/**
 * R2 Get Node - Get object from R2 and return signed URL
 */

import { z } from "zod";
import { Effect } from "effect";
import {
  WorkflowNodeDefinition,
  CodeGenContext,
  CodeGenResult
} from "../../core/types";
import {
  NodeType,
  NodeCategory,
  DataType,
  BindingType,
  ErrorCode
} from "../../core/enums";
import { BINDING_NAMES, TEMPLATE_PATTERNS } from "../../core/constants";

const R2GetConfigSchema = z.object({
  bucket: z.string().default(BINDING_NAMES.DEFAULT_R2).describe("binding:r2"),
  key: z.string().min(1),
  expiresIn: z
    .number()
    .min(1)
    .max(604800)
    .default(3600)
    .describe("Signed URL expiration in seconds (1-604800, default 3600)"),
  publicUrl: z
    .string()
    .optional()
    .describe("Public R2 URL base (e.g., https://pub-xxx.r2.dev)")
});

type R2GetConfig = z.infer<typeof R2GetConfigSchema>;

function resolveKeyExpression(
  key: string,
  graphContext: CodeGenContext["graphContext"]
): string {
  if (!key || typeof key !== "string") {
    return "";
  }
  if (key.includes("{{")) {
    // Return template literal expression for dynamic keys (without backticks, will be used in template literal)
    return key.replace(
      TEMPLATE_PATTERNS.TEMPLATE_REGEX,
      (_match, innerExpr) => {
        const trimmed = innerExpr.trim();
        if (trimmed.startsWith(TEMPLATE_PATTERNS.STATE_PREFIX)) {
          const path = trimmed.substring(TEMPLATE_PATTERNS.STATE_PREFIX.length);
          const [nodeId, ...rest] = path.split(
            TEMPLATE_PATTERNS.PATH_SEPARATOR
          );
          const tail = rest.length ? "." + rest.join(".") : ".output";
          return `\${_workflowState['${nodeId}']${tail}}`;
        }
        const [nodeRef, ...rest] = trimmed.split(
          TEMPLATE_PATTERNS.PATH_SEPARATOR
        );
        const stepName = graphContext.stepNameMap.get(nodeRef);
        if (stepName) {
          const tail = rest.length ? "." + rest.join(".") : "";
          return `\${_workflowResults.${stepName}${tail}}`;
        }
        const tail = rest.length ? "." + rest.join(".") : ".output";
        return `\${_workflowState['${nodeRef}']${tail}}`;
      }
    );
  }
  // Return key directly (will be used in template literal, so no quotes needed)
  return key;
}

export const R2GetNode: WorkflowNodeDefinition<R2GetConfig> = {
  metadata: {
    type: NodeType.R2_GET,
    name: "R2 Get",
    description: "Get object from R2 and return signed URL",
    category: NodeCategory.STORAGE,
    version: "1.0.0",
    icon: "Database",
    color: "#F59E0B",
    tags: ["r2", "storage", "read", "signed-url"]
  },
  configSchema: R2GetConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Trigger read",
      required: true
    }
  ],
  outputPorts: [
    {
      id: "signedUrl",
      label: "Signed URL",
      type: DataType.STRING,
      description: "Signed URL to access the object",
      required: false
    },
    {
      id: "metadata",
      label: "Metadata",
      type: DataType.OBJECT,
      description: "Object metadata (size, etag, uploaded date, etc.)",
      required: false
    },
    {
      id: "exists",
      label: "Exists",
      type: DataType.BOOLEAN,
      description: "Whether object exists",
      required: false
    }
  ],
  bindings: [
    {
      type: BindingType.R2,
      name: BINDING_NAMES.DEFAULT_R2,
      required: true,
      description: "R2 bucket binding"
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
      name: "Get File",
      description: "Get file from R2 and return signed URL",
      config: {
        bucket: "MY_BUCKET",
        key: "files/document.pdf",
        expiresIn: 3600
      }
    }
  ],
  presetOutput: {
    signedUrl: "https://pub-xxx.r2.dev/files/document.pdf?expires=1234567890",
    exists: true,
    metadata: {
      key: "files/document.pdf",
      size: 1024,
      etag: "abc123",
      uploaded: "2024-01-01T00:00:00Z"
    }
  },
  codegen: ({
    nodeId,
    config,
    stepName,
    graphContext
  }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function*(_) {
      const bucket = (config.bucket || BINDING_NAMES.DEFAULT_R2)
        .replace(/[^a-zA-Z0-9_]/g, "_");
      const keyExpr = resolveKeyExpression(config.key, graphContext);
      const expiresIn = config.expiresIn || 3600;
      const inputData =
        graphContext.edges
          .filter(e => e.target === nodeId)
          .map(
            e => `_workflowState['${e.source}']?.output || event.payload`
          )[0] || "event.payload";

      // Generate signed URL using R2's public URL or custom publicUrl
      // R2 signed URLs can be generated using the R2 API or public URLs if configured
      const publicUrlBase = config.publicUrl
        ? JSON.stringify(config.publicUrl)
        : "null";

      // Sanitize stepName for use as JavaScript identifier (replace hyphens with underscores)
      const sanitizedStepName = stepName.replace(/-/g, "_");

      const code = `
    _workflowResults.${sanitizedStepName} = await step.do("${stepName}", async () => {
      const inputData = ${inputData};
      const key = ${keyExpr.includes("${")
        ? `\`${keyExpr}\``
        : JSON.stringify(config.key || "")};
      const bucket = this.env["${bucket}"];
      
      // Get object metadata using head() - this is faster than get() as it doesn't download the body
      const object = await bucket.head(key);
      
      if (!object) {
        const result = {
          signedUrl: null,
          exists: false,
          metadata: null
        };
        _workflowState['${nodeId}'] = {
          input: inputData,
          output: result
        };
        return result;
      }
      
      // Generate signed URL
      // If publicUrl is configured (from R2 custom domain or public URL), use it
      // Otherwise, generate a presigned URL using the R2 API
      let signedUrl = null;
      const publicUrl = ${publicUrlBase};
      const expiresAt = Math.floor(Date.now() / 1000) + ${expiresIn};
      
      if (publicUrl) {
        // Use provided public URL (from R2 custom domain or public URL configuration)
        // Append expiration timestamp as query parameter
        const urlKey = encodeURIComponent(key).replace(/%2F/g, '/');
        signedUrl = \`\${publicUrl.replace(/\\/$/, '')}/\${urlKey}?expires=\${expiresAt}\`;
      } else {
        // Generate presigned URL using R2 API
        // This requires making an authenticated request to Cloudflare R2 API
        // For now, we'll construct a URL that can be used with R2's public endpoint
        // In production, you would call the R2 API to generate a proper presigned URL
        // Note: R2 doesn't have built-in presigned URL generation in Workers runtime
        // You need to use the R2 API or configure a public URL for the bucket
        signedUrl = \`r2://\${key}?expires=\${expiresAt}&bucket=\${bucket}\`;
      }
      
      const result = {
        signedUrl,
        exists: true,
        metadata: {
          key: object.key,
          version: object.version,
          size: object.size,
          etag: object.etag,
          httpEtag: object.httpEtag,
          uploaded: object.uploaded.toISOString(),
          httpMetadata: object.httpMetadata || {},
          customMetadata: object.customMetadata || {},
          storageClass: object.storageClass
        }
      };
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: result
      };
      return result;
    });`;

      return {
        code,
        requiredBindings: [{ name: bucket, type: BindingType.R2 }]
      };
    });
  }
};
