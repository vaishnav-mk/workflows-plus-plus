/**
 * Graph Analyzer - Analyzes workflow graph structure
 */

import { Effect } from "effect";
import { GraphContext } from "../../core/types";
import { ErrorCode } from "../../core/enums";
import { generateNodeId } from "../../core/utils/id-generator";

export class GraphAnalyzer {
  /**
   * Build graph context from workflow nodes and edges
   */
  static buildGraphContext(
    nodes: Array<{ id: string; type: string; data?: Record<string, unknown> }>,
    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
      targetHandle?: string;
    }>
  ): Effect.Effect<GraphContext, { _tag: ErrorCode; message: string }> {
    return Effect.gen(function* (_) {
      const nodeIdMap = new Map<string, string>();
      const stepNameMap = new Map<string, string>();
      const nodeTypeMap = new Map<string, string>();

      nodes.forEach(node => {
        nodeIdMap.set(node.id, node.id);
        nodeTypeMap.set(node.id, node.type);
      });

      const topoOrder = yield* _(GraphAnalyzer.topologicalSort(nodes, edges));
      
      const entryNode = nodes.find(n => n.type === "entry" || n.type === "mcp-tool-input");
      const returnNodes = nodes.filter(n => n.type === "return" || n.type === "mcp-tool-output");
      const lastReturnIndex = returnNodes.length > 0 
        ? topoOrder.indexOf(returnNodes[returnNodes.length - 1].id)
        : topoOrder.length - 1;
      
      topoOrder.forEach((nodeId, index) => {
        const nodeType = nodeTypeMap.get(nodeId) || "unknown";
        const isEntry = nodeId === entryNode?.id;
        const isReturn = nodeType === "return" || nodeType === "mcp-tool-output";
        
        // Generate standardized step name based on node type and position
        const stepName = generateNodeId(
          nodeType,
          index,
          isEntry,
          isReturn && index === lastReturnIndex,
          topoOrder.length
        );
        stepNameMap.set(nodeId, stepName);
      });

      const entryNodeId = yield* _(GraphAnalyzer.findEntryNode(nodes));

      return {
        nodes,
        edges,
        stepNameMap,
        nodeIdMap,
        topoOrder,
        entryNodeId
      };
    });
  }

  /**
   * Topological sort of workflow nodes
   */
  private static topologicalSort(
    nodes: Array<{ id: string }>,
    edges: Array<{ source: string; target: string }>
  ): Effect.Effect<string[], { _tag: ErrorCode; message: string }> {
    return Effect.gen(function* (_) {
      const inDegree = new Map<string, number>();
      const graph = new Map<string, string[]>();

      nodes.forEach(node => {
        inDegree.set(node.id, 0);
        graph.set(node.id, []);
      });

      edges.forEach(edge => {
        const current = inDegree.get(edge.target) || 0;
        inDegree.set(edge.target, current + 1);
        
        const neighbors = graph.get(edge.source) || [];
        neighbors.push(edge.target);
        graph.set(edge.source, neighbors);
      });

      const queue: string[] = [];
      nodes.forEach(node => {
        if ((inDegree.get(node.id) || 0) === 0) {
          queue.push(node.id);
        }
      });

      const result: string[] = [];
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        result.push(nodeId);

        const neighbors = graph.get(nodeId) || [];
        neighbors.forEach(neighbor => {
          const degree = inDegree.get(neighbor) || 0;
          inDegree.set(neighbor, degree - 1);
          if (inDegree.get(neighbor) === 0) {
            queue.push(neighbor);
          }
        });
      }

      if (result.length !== nodes.length) {
        return yield* _(Effect.fail({
          _tag: ErrorCode.CYCLE_DETECTED,
          message: "Workflow graph contains cycles",
        }));
      }

      return result;
    });
  }


  /**
   * Find entry node
   */
  static findEntryNode(nodes: Array<{ id: string; type: string }>): Effect.Effect<string, { _tag: ErrorCode; message: string }> {
    return Effect.gen(function* (_) {
      const entryNode = nodes.find(n => n.type === "entry" || n.type === "mcp-tool-input");
      if (!entryNode) {
        return yield* _(Effect.fail({
          _tag: ErrorCode.MISSING_ENTRY_NODE,
          message: "Workflow must have an entry node",
        }));
      }
      return entryNode.id;
    });
  }
}

