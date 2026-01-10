import { z } from "zod";
import { Effect } from "effect";
import {
  WorkflowNodeDefinition,
  CodeGenResult
} from "../../core/types";
import {
  NodeType,
  NodeCategory,
  DataType,
  BindingType,
  ErrorCode
} from "../../core/enums";
import { TEMPLATE_PATTERNS } from "../../core/constants";

const AISearchConfigSchema = z.object({
  autoragName: z.string().describe("binding:ai-search"),
  query: z.string(),
  model: z.string().default("@cf/meta/llama-3.3-70b-instruct-fp8-fast").describe("searchable:ai-models:text-generation"),
  systemPrompt: z.string().optional(),
  rewriteQuery: z.boolean().default(false),
  maxNumResults: z.number().min(1).max(50).default(10),
  scoreThreshold: z.number().min(0).max(0.5).optional()
});

type AISearchConfig = z.infer<typeof AISearchConfigSchema>;

function sanitizeIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

export const AISearchNode: WorkflowNodeDefinition<AISearchConfig> = {
  metadata: {
    type: NodeType.AI_SEARCH,
    name: "AI Search",
    description: "Search and generate responses using Cloudflare AI Search",
    category: NodeCategory.AI,
    version: "1.0.0",
    icon: "Search",
    color: "#8B5CF6",
    tags: ["ai", "search", "rag"]
  },
  configSchema: AISearchConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Trigger AI search",
      required: true
    }
  ],
  outputPorts: [
    {
      id: "response",
      label: "Response",
      type: DataType.STRING,
      description: "Generated response",
      required: false
    },
    {
      id: "data",
      label: "Data",
      type: DataType.ARRAY,
      description: "Search results",
      required: false
    }
  ],
  bindings: [
    {
      type: BindingType.AI,
      name: "AI",
      required: true,
      description: "Cloudflare AI binding for AI Search"
    }
  ],
  capabilities: {
    playgroundCompatible: true,
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
      name: "Basic AI Search",
      description: "Search corpus and generate response",
      config: {
        autoragName: "my-autorag",
        query: "How do I train a llama to deliver coffee?",
        maxNumResults: 5
      }
    }
  ],
  presetOutput: {
    response: "AI generated response",
    data: []
  },
  codegen: ({
    nodeId,
    config,
    stepName,
    graphContext
  }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function*(_) {
      let query: string;
      const hasTemplate =
        typeof config.query === "string" && config.query.includes("{{");

      if (hasTemplate) {
        const templateParts = config.query.split(/\{\{([^}]+)\}\}/g);
        let templateLiteral = "`";

        for (let i = 0; i < templateParts.length; i++) {
          if (i % 2 === 0) {
            templateLiteral += templateParts[i]
              .replace(/\\/g, "\\\\")
              .replace(/`/g, "\\`")
              .replace(/\$/g, "\\$");
          } else {
            const expr = templateParts[i].trim();
            let jsExpr: string;

            if (expr.startsWith(TEMPLATE_PATTERNS.STATE_PREFIX)) {
              const path = expr.substring(
                TEMPLATE_PATTERNS.STATE_PREFIX.length
              );
              const [nodeId, ...rest] = path.split(
                TEMPLATE_PATTERNS.PATH_SEPARATOR
              );
              const tail = rest.length ? "." + rest.join(".") : ".output";
              jsExpr = `_workflowState['${nodeId}']${tail}`;
            } else {
              const [nodeRef, ...rest] = expr.split(
                TEMPLATE_PATTERNS.PATH_SEPARATOR
              );
              const mappedStepName = graphContext.stepNameMap.get(nodeRef);
              const nodeId = graphContext.nodes.find(n => n.data?.label === nodeRef)?.id;
              
              if (mappedStepName && nodeId) {
                const nodeInGraph = graphContext.nodes.find(n => n.id === nodeId);
                const isEntryNode = nodeInGraph?.type === 'entry';
                
                if (isEntryNode) {
                  const tail = rest.length ? "." + rest.join(".") : ".output";
                  jsExpr = `_workflowState['${nodeId}']${tail}`;
                } else {
                  const tail = rest.length ? "." + rest.join(".") : "";
                  const sanitizedMappedStepName = sanitizeIdentifier(
                    mappedStepName
                  );
                  jsExpr = `_workflowResults.${sanitizedMappedStepName}${tail}`;
                }
              } else {
                const tail = rest.length ? "." + rest.join(".") : ".output";
                jsExpr = `_workflowState['${nodeRef}']${tail}`;
              }
            }
            templateLiteral += "${JSON.stringify(" + jsExpr + ")}";
          }
        }
        templateLiteral += "`";
        query = templateLiteral;
      } else {
        query = JSON.stringify(config.query);
      }

      const options: string[] = [`query: ${query}`];

      if (config.model) {
        options.push(`model: ${JSON.stringify(config.model)}`);
      }

      if (config.systemPrompt) {
        options.push(`system_prompt: ${JSON.stringify(config.systemPrompt)}`);
      }

      if (config.rewriteQuery !== undefined) {
        options.push(`rewrite_query: ${config.rewriteQuery}`);
      }

      if (config.maxNumResults !== undefined) {
        options.push(`max_num_results: ${config.maxNumResults}`);
      }

      if (config.scoreThreshold !== undefined) {
        options.push(`ranking_options: { score_threshold: ${config.scoreThreshold} }`);
      }

      const inputData =
        graphContext.edges
          .filter(e => e.target === nodeId)
          .map(
            e => `_workflowState['${e.source}']?.output || event.payload`
          )[0] || "event.payload";

      const sanitizedStepName = sanitizeIdentifier(stepName);

      const code = `
    _workflowResults.${sanitizedStepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      const response = await this.env.AI.autorag(${JSON.stringify(config.autoragName)}).aiSearch({
        ${options.join(",\n        ")}
      });
      const result = {
        response: response.response || "",
        data: response.data || []
      };
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: result
      };
      return result;
    });`;

      return {
        code,
        requiredBindings: [{ name: "AI", type: BindingType.AI }]
      };
    });
  }
};
