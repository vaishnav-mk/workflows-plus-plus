/**
 * Edge Enrichment Utility
 * Unified logic for enriching edges with conditional case data
 */

import type { Node, Edge } from "reactflow";

/**
 * Enrich a single edge with conditional case data if it comes from a conditional router
 */
export function enrichEdge(edge: Edge, sourceNode: Node | undefined, allEdges: Edge[] = []): Edge {
  if (!sourceNode || sourceNode.data?.type !== 'conditional-router') {
    return {
      ...edge,
      type: edge.type || 'step',
    };
  }

  const config = (sourceNode.data as any)?.config || {};
  const cases = Array.isArray(config.cases) ? config.cases : [];

  // If edge has sourceHandle, find matching case
  if (edge.sourceHandle) {
    const caseConfig = cases.find((c: any) => c.case === edge.sourceHandle);
    if (caseConfig) {
      return {
        ...edge,
        type: 'conditional',
        data: {
          ...(edge.data && typeof edge.data === 'object' ? edge.data : {}),
          caseLabel: caseConfig.case,
          caseValue: caseConfig.value,
          isDefault: caseConfig.isDefault || false,
        },
      };
    }
  }

  // If no sourceHandle, try to infer from edge order
  // This handles edges created before sourceHandle was set
  const edgesFromRouter = allEdges.filter(e => e.source === edge.source);
  const edgeIndex = edgesFromRouter.findIndex(e => e.id === edge.id);
  if (edgeIndex >= 0 && edgeIndex < cases.length) {
    const caseConfig = cases[edgeIndex];
    return {
      ...edge,
      type: 'conditional',
      sourceHandle: caseConfig.case,
      data: {
        ...(edge.data && typeof edge.data === 'object' ? edge.data : {}),
        caseLabel: caseConfig.case,
        caseValue: caseConfig.value,
        isDefault: caseConfig.isDefault || false,
      },
    };
  }

  // Fallback: return edge as-is with step type
  return {
    ...edge,
    type: edge.type || 'step',
  };
}

/**
 * Enrich multiple edges with conditional case data
 */
export function enrichEdges(edges: Edge[], nodes: Node[]): Edge[] {
  return edges.map(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    return enrichEdge(edge, sourceNode, edges);
  });
}

