import { Effect } from "effect";
import { ErrorCode } from "../../core/enums";

export class WorkflowValidator {
  static validateWorkflow(
    nodes: Array<{ id: string; type: string }>,
    edges: Array<{ source: string; target: string }>
  ): Effect.Effect<void, { _tag: ErrorCode; message: string }> {
    return Effect.gen(function*(_) {
      yield* _(WorkflowValidator.validateNodes(nodes));
      yield* _(WorkflowValidator.validateEdges(nodes, edges));
      yield* _(WorkflowValidator.validateGraph(nodes, edges));
    });
  }

  private static validateNodes(
    nodes: Array<{ id: string; type: string }>
  ): Effect.Effect<void, { _tag: ErrorCode; message: string }> {
    return Effect.gen(function*(_) {
      if (!nodes || nodes.length === 0) {
        return yield* _(
          Effect.fail({
            _tag: ErrorCode.GRAPH_VALIDATION_ERROR,
            message: "Workflow must have at least one node"
          })
        );
      }

      const nodeIds = new Set<string>();
      for (const node of nodes) {
        if (!node.id) {
          return yield* _(
            Effect.fail({
              _tag: ErrorCode.GRAPH_VALIDATION_ERROR,
              message: "All nodes must have an id"
            })
          );
        }
        if (nodeIds.has(node.id)) {
          return yield* _(
            Effect.fail({
              _tag: ErrorCode.GRAPH_VALIDATION_ERROR,
              message: `Duplicate node id: ${node.id}`
            })
          );
        }
        nodeIds.add(node.id);
      }
    });
  }

  private static validateEdges(
    nodes: Array<{ id: string }>,
    edges: Array<{ source: string; target: string }>
  ): Effect.Effect<void, { _tag: ErrorCode; message: string }> {
    return Effect.gen(function*(_) {
      const nodeIds = new Set(nodes.map(n => n.id));

      for (const edge of edges) {
        if (!nodeIds.has(edge.source)) {
          return yield* _(
            Effect.fail({
              _tag: ErrorCode.GRAPH_VALIDATION_ERROR,
              message: `Edge source node not found: ${edge.source}`
            })
          );
        }
        if (!nodeIds.has(edge.target)) {
          return yield* _(
            Effect.fail({
              _tag: ErrorCode.GRAPH_VALIDATION_ERROR,
              message: `Edge target node not found: ${edge.target}`
            })
          );
        }
        if (edge.source === edge.target) {
          return yield* _(
            Effect.fail({
              _tag: ErrorCode.GRAPH_VALIDATION_ERROR,
              message: `Self-loop detected: ${edge.source}`
            })
          );
        }
      }
    });
  }

  private static validateGraph(
    nodes: Array<{ id: string; type: string }>,
    _edges: Array<{ source: string; target: string }>
  ): Effect.Effect<void, { _tag: ErrorCode; message: string }> {
    return Effect.gen(function*(_) {
      const entryNodes = nodes.filter(
        n => n.type === "entry" || n.type === "mcp-tool-input"
      );
      if (entryNodes.length === 0) {
        return yield* _(
          Effect.fail({
            _tag: ErrorCode.MISSING_ENTRY_NODE,
            message: "Workflow must have an entry node"
          })
        );
      }
      if (entryNodes.length > 1) {
        return yield* _(
          Effect.fail({
            _tag: ErrorCode.GRAPH_VALIDATION_ERROR,
            message: "Workflow must have exactly one entry node"
          })
        );
      }
    });
  }
}
