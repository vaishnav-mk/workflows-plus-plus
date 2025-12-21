import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenContext, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, BindingType, ErrorCode } from "../../core/enums";
import { BINDING_NAMES, TEMPLATE_PATTERNS } from "../../core/constants";

const R2PutConfigSchema = z.object({
  bucket: z.string().default(BINDING_NAMES.DEFAULT_R2).describe("binding:r2"),
  key: z.string().min(1),
  value: z.object({
    type: z.enum(["static", "variable", "expression"]),
    content: z.any(),
  }),
  httpMetadata: z.object({
    contentType: z.string().optional(),
    contentLanguage: z.string().optional(),
    contentEncoding: z.string().optional(),
    contentDisposition: z.string().optional(),
    cacheControl: z.string().optional(),
    cacheExpiry: z.number().optional(),
  }).optional(),
  customMetadata: z.record(z.string()).optional(),
});

type R2PutConfig = z.infer<typeof R2PutConfigSchema>;

function resolveKeyExpression(
  key: string,
  graphContext: CodeGenContext["graphContext"]
): string {
  if (!key || typeof key !== 'string') {
    return '';
  }
  if (key.includes("{{")) {
    return key.replace(TEMPLATE_PATTERNS.TEMPLATE_REGEX, (_match, innerExpr) => {
      const trimmed = innerExpr.trim();
      if (trimmed.startsWith(TEMPLATE_PATTERNS.STATE_PREFIX)) {
        const path = trimmed.substring(TEMPLATE_PATTERNS.STATE_PREFIX.length);
        const [nodeId, ...rest] = path.split(TEMPLATE_PATTERNS.PATH_SEPARATOR);
        const tail = rest.length ? "." + rest.join(".") : ".output";
        return `\${_workflowState['${nodeId}']${tail}}`;
      }
      const [nodeRef, ...rest] = trimmed.split(TEMPLATE_PATTERNS.PATH_SEPARATOR);
      const stepName = graphContext.stepNameMap.get(nodeRef);
      if (stepName) {
        const tail = rest.length ? "." + rest.join(".") : "";
        return `\${_workflowResults.${stepName}${tail}}`;
      }
      const tail = rest.length ? "." + rest.join(".") : ".output";
      return `\${_workflowState['${nodeRef}']${tail}}`;
    });
  }
  return key;
}

function resolveValueContent(
  value: R2PutConfig["value"],
  graphContext: CodeGenContext["graphContext"]
): string {
  if (value.type === "static") {
    if (typeof value.content === "string") {
      return JSON.stringify(value.content);
    }
    return JSON.stringify(value.content);
  } else if (value.type === "variable" || value.type === "expression") {
    const content = value.content;
    if (typeof content === "string" && content.includes("{{")) {
      return content.replace(TEMPLATE_PATTERNS.TEMPLATE_REGEX, (_match, innerExpr) => {
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
    return content;
  }
  return JSON.stringify(value.content);
}

export const R2PutNode: WorkflowNodeDefinition<R2PutConfig> = {
  metadata: {
    type: NodeType.R2_PUT,
    name: "R2 Put",
    description: "Upload object to R2 storage",
    category: NodeCategory.STORAGE,
    version: "1.0.0",
    icon: "Save",
    color: "#F59E0B",
    tags: ["r2", "storage", "write", "upload"],
  },
  configSchema: R2PutConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Trigger upload",
      required: true,
    },
  ],
  outputPorts: [
    {
      id: "success",
      label: "Success",
      type: DataType.BOOLEAN,
      description: "Upload successful",
      required: false,
    },
    {
      id: "key",
      label: "Key",
      type: DataType.STRING,
      description: "Key that was written",
      required: false,
    },
    {
      id: "etag",
      label: "ETag",
      type: DataType.STRING,
      description: "ETag of uploaded object",
      required: false,
    },
    {
      id: "size",
      label: "Size",
      type: DataType.NUMBER,
      description: "Size of uploaded object in bytes",
      required: false,
    },
  ],
  bindings: [
    {
      type: BindingType.R2,
      name: BINDING_NAMES.DEFAULT_R2,
      required: true,
      description: "R2 bucket binding",
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
      name: "Upload File",
      description: "Upload file to R2",
      config: {
        bucket: "MY_BUCKET",
        key: "files/document.pdf",
        value: { type: "static", content: "file content" },
        httpMetadata: { contentType: "application/pdf" },
      },
    },
  ],
  presetOutput: {
    success: true,
    key: "files/document.pdf",
    etag: "abc123",
    size: 1024,
  },
  codegen: ({ nodeId, config, stepName, graphContext }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const bucket = (config.bucket || BINDING_NAMES.DEFAULT_R2).replace(/[^a-zA-Z0-9_]/g, "_");
      const keyExpr = resolveKeyExpression(config.key, graphContext);
      const valueContent = resolveValueContent(config.value, graphContext);
      const inputData = graphContext.edges
        .filter(e => e.target === nodeId)
        .map(e => `_workflowState['${e.source}']?.output || event.payload`)[0] || "event.payload";

      const optionLines: string[] = [];
      
      if (config.httpMetadata) {
        const httpMetaLines: string[] = [];
        if (config.httpMetadata.contentType) {
          httpMetaLines.push(`contentType: ${JSON.stringify(config.httpMetadata.contentType)}`);
        }
        if (config.httpMetadata.contentLanguage) {
          httpMetaLines.push(`contentLanguage: ${JSON.stringify(config.httpMetadata.contentLanguage)}`);
        }
        if (config.httpMetadata.contentEncoding) {
          httpMetaLines.push(`contentEncoding: ${JSON.stringify(config.httpMetadata.contentEncoding)}`);
        }
        if (config.httpMetadata.contentDisposition) {
          httpMetaLines.push(`contentDisposition: ${JSON.stringify(config.httpMetadata.contentDisposition)}`);
        }
        if (config.httpMetadata.cacheControl) {
          httpMetaLines.push(`cacheControl: ${JSON.stringify(config.httpMetadata.cacheControl)}`);
        }
        if (config.httpMetadata.cacheExpiry !== undefined) {
          httpMetaLines.push(`cacheExpiry: new Date(${config.httpMetadata.cacheExpiry})`);
        }
        
        if (httpMetaLines.length > 0) {
          optionLines.push(`httpMetadata: {\n          ${httpMetaLines.join(",\n          ")}\n        }`);
        }
      }
      
      if (config.customMetadata && Object.keys(config.customMetadata).length > 0) {
        optionLines.push(`customMetadata: ${JSON.stringify(config.customMetadata)}`);
      }
      
      const optionsObject = optionLines.length > 0
        ? `, {\n        ${optionLines.join(",\n        ")}\n      }`
        : "";

      const sanitizedStepName = stepName.replace(/-/g, "_");
      
      const code = `
    _workflowResults.${sanitizedStepName} = await step.do("${stepName}", async () => {
      const inputData = ${inputData};
      const key = ${keyExpr.includes('${') ? `\`${keyExpr}\`` : JSON.stringify(config.key || '')};
      const bucket = this.env["${bucket}"];
      
      let valueToUpload = ${valueContent};
      
      if (typeof valueToUpload === 'object' && valueToUpload !== null) {
        if (!(valueToUpload instanceof Blob) && 
            !(valueToUpload instanceof ArrayBuffer) && 
            !(valueToUpload instanceof ReadableStream) &&
            !ArrayBuffer.isView(valueToUpload)) {
          valueToUpload = JSON.stringify(valueToUpload);
        }
      }
      
      const result = await bucket.put(key, valueToUpload${optionsObject});
      
      if (!result) {
        throw new Error("Failed to upload object to R2");
      }
      
      const output = {
        success: true,
        key: result.key,
        version: result.version,
        etag: result.etag,
        httpEtag: result.httpEtag,
        size: result.size,
        uploaded: result.uploaded.toISOString(),
        storageClass: result.storageClass
      };
      _workflowState['${nodeId}'] = {
        input: inputData,
        output
      };
      return output;
    });`;

      return {
        code,
        requiredBindings: [{ name: bucket, type: BindingType.R2 }],
      };
    });
  },
};
