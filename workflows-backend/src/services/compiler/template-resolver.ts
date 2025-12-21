import { Effect } from "effect";
import { GraphContext, TemplateResolutionResult } from "../../core/types";
import { TemplateResolutionStatus, ErrorCode } from "../../core/enums";
import { TEMPLATE_PATTERNS } from "../../core/constants";

export const resolveTemplate = (
  expression: string,
  graphContext: GraphContext,
  _nodeId: string
): Effect.Effect<TemplateResolutionResult, { _tag: ErrorCode; message: string }> => {
  return Effect.gen(function* (_) {
    if (!expression.includes("{{")) {
      return {
        resolved: expression,
        status: TemplateResolutionStatus.SUCCESS,
      };
    }

    const errors: string[] = [];
    let resolved = expression;

    try {
      resolved = expression.replace(TEMPLATE_PATTERNS.TEMPLATE_REGEX, (match, innerExpr) => {
        const trimmed = innerExpr.trim();
        
        if (trimmed.startsWith(TEMPLATE_PATTERNS.STATE_PREFIX)) {
          const path = trimmed.substring(TEMPLATE_PATTERNS.STATE_PREFIX.length);
          const [refNodeId, ...rest] = path.split(TEMPLATE_PATTERNS.PATH_SEPARATOR);
          
          if (!graphContext.nodeIdMap.has(refNodeId)) {
            errors.push(`Node not found: ${refNodeId}`);
            return match;
          }
          
          const tail = rest.length ? "." + rest.join(".") : ".output";
          return `[resolved: ${refNodeId}${tail}]`;
        }
        
        const [nodeRef, ...rest] = trimmed.split(TEMPLATE_PATTERNS.PATH_SEPARATOR);
        const stepName = graphContext.stepNameMap.get(nodeRef);
        
        if (stepName) {
          const tail = rest.length ? "." + rest.join(".") : "";
          return `[resolved: ${stepName}${tail}]`;
        }
        
        if (!graphContext.nodeIdMap.has(nodeRef)) {
          errors.push(`Node not found: ${nodeRef}`);
          return match;
        }
        
        const tail = rest.length ? "." + rest.join(".") : ".output";
        return `[resolved: ${nodeRef}${tail}]`;
      });
    } catch (error) {
      return yield* _(Effect.fail({
        _tag: ErrorCode.TEMPLATE_ERROR,
        message: error instanceof Error ? error.message : "Template resolution failed",
      }));
    }

    if (errors.length > 0) {
      return {
        resolved,
        status: TemplateResolutionStatus.ERROR,
        errors,
      };
    }

    return {
      resolved,
      status: TemplateResolutionStatus.SUCCESS,
    };
  });
}

const resolveNestedTemplates = (
  obj: unknown,
  graphContext: GraphContext,
  nodeId: string
): Effect.Effect<{ resolved: unknown; errors?: string[] }, { _tag: ErrorCode; message: string }> => {
  if (obj === null || typeof obj !== 'object') {
    return Effect.succeed({ resolved: obj });
  }
  
  return Effect.gen(function* (_) {
    if (Array.isArray(obj)) {
      const resolved: unknown[] = [];
      const errors: string[] = [];
      
      for (const item of obj) {
        if (typeof item === "string" && item.includes("{{")) {
          const result = yield* _(
            resolveTemplate(item, graphContext, nodeId)
          );
          resolved.push(result.resolved);
          if (result.errors) {
            errors.push(...result.errors);
          }
        } else if (typeof item === "object" && item !== null) {
          const nestedResult = yield* _(
            resolveNestedTemplates(item, graphContext, nodeId)
          );
          resolved.push(nestedResult.resolved);
          if (nestedResult.errors) {
            errors.push(...nestedResult.errors);
          }
        } else {
          resolved.push(item);
        }
      }
      
      return { resolved, errors: errors.length > 0 ? errors : undefined };
    }
    
    const resolved: Record<string, unknown> = {};
    const errors: string[] = [];
    
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof value === "string" && value.includes("{{")) {
        const result = yield* _(
          resolveTemplate(value, graphContext, nodeId)
        );
        resolved[key] = result.resolved;
        if (result.errors) {
          errors.push(...result.errors);
        }
      } else if (typeof value === "object" && value !== null) {
        const nestedResult = yield* _(
          resolveNestedTemplates(value, graphContext, nodeId)
        );
        resolved[key] = nestedResult.resolved;
        if (nestedResult.errors) {
          errors.push(...nestedResult.errors);
        }
      } else {
        resolved[key] = value;
      }
    }
    
    return { resolved, errors: errors.length > 0 ? errors : undefined };
  });
}

export const resolveWorkflow = (
  workflow: {
    nodes: Array<{ id: string; type: string; data?: Record<string, unknown>; config?: Record<string, unknown> }>;
    edges: Array<{ source: string; target: string }>;
  },
  graphContext: GraphContext
): Effect.Effect<{
  nodes: Array<{ id: string; resolvedConfig: Record<string, unknown>; errors?: string[] }>;
}, { _tag: ErrorCode; message: string }> => {
  return Effect.gen(function* (_) {
    const resolvedNodes: Array<{ id: string; resolvedConfig: Record<string, unknown>; errors?: string[] }> = [];

    for (const node of workflow.nodes) {
      const config = node.config || node.data?.config || {};
      const resolvedConfig: Record<string, unknown> = {};
      const errors: string[] = [];

      for (const [key, value] of Object.entries(config)) {
        if (typeof value === "string" && value.includes("{{")) {
          const result = yield* _(
            resolveTemplate(value, graphContext, node.id)
          );
          resolvedConfig[key] = result.resolved;
          if (result.errors) {
            errors.push(...result.errors);
          }
        } else if (typeof value === "object" && value !== null) {
          const nestedResult = yield* _(
            resolveNestedTemplates(value, graphContext, node.id)
          );
          resolvedConfig[key] = nestedResult.resolved;
          if (nestedResult.errors) {
            errors.push(...nestedResult.errors);
          }
        } else {
          resolvedConfig[key] = value;
        }
      }

      resolvedNodes.push({
        id: node.id,
        resolvedConfig,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    return { nodes: resolvedNodes };
  });
}
