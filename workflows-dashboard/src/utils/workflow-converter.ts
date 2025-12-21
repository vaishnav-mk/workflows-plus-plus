import type { Node, Edge } from "reactflow";
import type { WorkflowNode, WorkflowEdge } from "@/lib/api/types";

export function convertNodeToWorkflowNode(node: Node): WorkflowNode {
  const nodeType =
    node.data && typeof node.data === "object" && "type" in node.data && typeof node.data.type === "string"
      ? node.data.type
      : node.type || "";
  const nodeLabel =
    node.data && typeof node.data === "object" && "label" in node.data && typeof node.data.label === "string"
      ? node.data.label
      : "";
  const nodeConfig =
    node.data && typeof node.data === "object" && "config" in node.data && typeof node.data.config === "object" && node.data.config && !Array.isArray(node.data.config)
      ? node.data.config
      : {};

  return {
    id: node.id,
    type: nodeType,
    data: {
      label: nodeLabel,
      type: nodeType,
      config: nodeConfig as Record<string, unknown>
    },
    config: nodeConfig as Record<string, unknown>
  };
}

export function convertEdgeToWorkflowEdge(edge: Edge): WorkflowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || null,
    targetHandle: edge.targetHandle || null
  };
}

export function convertNodesToWorkflowNodes(nodes: Node[]): WorkflowNode[] {
  return nodes.map(convertNodeToWorkflowNode);
}

export function convertEdgesToWorkflowEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map(convertEdgeToWorkflowEdge);
}

