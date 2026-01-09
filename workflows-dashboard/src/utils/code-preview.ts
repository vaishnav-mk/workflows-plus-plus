import type { ParsedNode } from "@/types/components";
import { CODE_PREVIEW } from "@/config/code-preview";

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith("#")) {
    return `rgba(107, 114, 128, ${alpha})`;
  }
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return `rgba(107, 114, 128, ${alpha})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(107, 114, 128, ${alpha})`;
  }
}

export function parseCodeNodes(
  generatedCode: string,
  getNodeColor: (nodeType: string, nodeId: string) => string
): ParsedNode[] {
  if (!generatedCode || generatedCode === CODE_PREVIEW.NO_CODE_MESSAGE) return [];

  const lines = generatedCode.split("\n");
  const parsedNodesList: ParsedNode[] = [];
  const nodeStack: {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    startLine: number;
  }[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    const nodeStartMatch = line.match(
      /console\.log\((JSON\.stringify\()?\{type:'WF_NODE_START',nodeId:'([^']+)',nodeName:([^,]+),nodeType:'([^']+)'/
    );
    if (nodeStartMatch) {
      const [, , nodeId, nodeName, nodeType] = nodeStartMatch;
      nodeStack.push({
        nodeId,
        nodeName: nodeName.replace(/^["']|["']$/g, ""),
        nodeType,
        startLine: lineNumber
      });
    }

    const nodeEndMatch = line.match(
      /console\.log\((JSON\.stringify\()?\{type:'WF_NODE_(END|ERROR)',nodeId:'([^']+)'/
    );
    if (nodeEndMatch && nodeStack.length > 0) {
      const topNode = nodeStack.pop();
      if (topNode) {
        parsedNodesList.push({
          ...topNode,
          endLine: lineNumber,
          color: getNodeColor(topNode.nodeType, topNode.nodeId)
        });
      }
    }
  });

  nodeStack.forEach((topNode) => {
    parsedNodesList.push({
      ...topNode,
      endLine: lines.length,
      color: getNodeColor(topNode.nodeType, topNode.nodeId)
    });
  });

  return parsedNodesList;
}

export function getNodeColor(
  nodeType: string,
  nodeId: string,
  catalog: Array<{ type: string; color?: string }>,
  nodes: Array<{ id: string; data?: any }>
): string {
  const catalogItem = catalog.find((item) => item.type === nodeType);
  const workflowNode = nodes.find((n) => n.id === nodeId);
  const nodeData = workflowNode?.data as any;
  return catalogItem?.color || nodeData?.color || CODE_PREVIEW.DEFAULT_COLOR;
}

