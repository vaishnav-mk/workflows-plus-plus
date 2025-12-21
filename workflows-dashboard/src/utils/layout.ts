import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';

const NODE_WIDTH = 260 as const;
const NODE_HEIGHT = 100 as const;

export function getLayoutedNodes(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ 
    rankdir: 'TB',
    nodesep: 50,
    ranksep: 150,
    align: 'UL',
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: NODE_WIDTH, 
      height: NODE_HEIGHT 
    });
  });

  edges.forEach((edge) => {
    try {
      dagreGraph.setEdge(edge.source, edge.target);
    } catch (error) {
      console.warn('[Layout] Skipping invalid edge:', edge, error);
    }
  });

  if (edges.length === 0) {
    const canvasWidth = 2000;
    const centerX = canvasWidth / 2;
    return nodes.map((node, index) => {
      const y = 50 + (index * (NODE_HEIGHT + 150));
      return {
        ...node,
        position: {
          x: centerX - NODE_WIDTH / 2,
          y: y,
        },
      };
    });
  }

  dagre.layout(dagreGraph);

  const outgoingCount: Record<string, number> = {};
  const incomingCount: Record<string, number> = {};

  edges.forEach((edge) => {
    outgoingCount[edge.source] = (outgoingCount[edge.source] || 0) + 1;
    incomingCount[edge.target] = (incomingCount[edge.target] || 0) + 1;
  });

  const hasBranch = edges.some(
    (edge) =>
      (outgoingCount[edge.source] || 0) > 1 ||
      (incomingCount[edge.target] || 0) > 1
  );

  if (!hasBranch) {
    const canvasWidth = 2000;
    const centerX = canvasWidth / 2;

    return nodes.map((node) => {
      const dagreNode = dagreGraph.node(node.id);
      if (dagreNode) {
        return {
          ...node,
          position: {
            x: centerX - NODE_WIDTH / 2,
            y: dagreNode.y - NODE_HEIGHT / 2,
          },
        };
      }
      return node;
    });
  }

  const canvasWidth = 2000;
  let minX = Infinity;
  let maxX = -Infinity;

  nodes.forEach((node) => {
    const dagreNode = dagreGraph.node(node.id);
    if (dagreNode) {
      const nodeLeft = dagreNode.x - NODE_WIDTH / 2;
      const nodeRight = dagreNode.x + NODE_WIDTH / 2;
      minX = Math.min(minX, nodeLeft);
      maxX = Math.max(maxX, nodeRight);
    }
  });

  const graphWidth = maxX - minX;
  const centerOffset = (canvasWidth - graphWidth) / 2 - minX;

  return nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    if (dagreNode) {
      return {
        ...node,
        position: {
          x: dagreNode.x + centerOffset - NODE_WIDTH / 2,
          y: dagreNode.y - NODE_HEIGHT / 2,
        },
      };
    }
    return node;
  });
}
