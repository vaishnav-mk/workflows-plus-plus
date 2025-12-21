import type { Node, Edge } from "reactflow";
import { apiClient } from "@/lib/api-client";

const LOG_PREFIX = '[NodeBuilder]';

interface NodeDefinition {
  metadata: {
    type: string;
    name: string;
    icon: string;
    color?: string;
  };
}

export async function createNodeFromBackend(
  nodeType: string,
  position: { x: number; y: number },
  config?: Record<string, unknown>
): Promise<Node> {
  
  const result = await apiClient.getNodeDefinition(nodeType);
  
  if (!result.success || !result.data) {
    console.error(`${LOG_PREFIX} Failed to fetch node definition for:`, nodeType);
    throw new Error(`Failed to fetch node definition for ${nodeType}`);
  }
  
  const nodeDef = result.data as NodeDefinition;
  const metadata = nodeDef.metadata;
  
  const { nodes } = await import("@/stores/workflow/nodesStore").then(m => m.useNodesStore.getState());
  const transformCount = nodes.filter(n => n.data?.type === 'transform').length;
  const sanitizedType = nodeType.replace(/[^a-z0-9]/g, "_");
  const nodeId = nodeType === 'entry' 
    ? 'step_entry_0'
    : nodeType === 'transform'
    ? `step_transform_${transformCount}`
    : nodeType === 'return'
    ? `step_return_${nodes.length}`
    : `step_${sanitizedType}_${nodes.length}`;
  
  let defaultConfig = config || {};
  if (nodeType === 'conditional-router' && !config?.cases) {
    defaultConfig = {
      conditionPath: '',
      cases: [
        { case: 'success', value: true },
        { case: 'error', isDefault: true },
      ],
    };
  }

  return {
    id: nodeId,
    type: "default",
    position,
    data: {
      label: metadata.name,
      type: nodeType,
      icon: metadata.icon,
      status: "idle",
      config: defaultConfig,
    },
  };
}

export async function createDefaultWorkflowNodes(): Promise<{
  nodes: Node[];
  edges: Edge[];
}> {
  
  try {
    const [entryResult, returnResult] = await Promise.all([
      apiClient.getNodeDefinition("entry"),
      apiClient.getNodeDefinition("return"),
    ]);
    
    if (!entryResult.success || !entryResult.data) {
      throw new Error("Failed to fetch entry node definition");
    }
    
    if (!returnResult.success || !returnResult.data) {
      throw new Error("Failed to fetch return node definition");
    }
    
    const entryDef = entryResult.data as NodeDefinition;
    const returnDef = returnResult.data as NodeDefinition;
    
    const nodeWidth = 200;
    const canvasWidth = 2000;
    const centerX = (canvasWidth / 2) - (nodeWidth / 2);
    
    const entryNode: Node = {
      id: 'step_entry_0',
      type: "default",
      position: { x: centerX, y: 100 },
      data: {
        label: entryDef.metadata.name,
        type: "entry",
        icon: entryDef.metadata.icon,
        status: "idle",
        config: {},
      },
    };
    
    const returnNode: Node = {
      id: 'step_return_1',
      type: "default",
      position: { x: centerX, y: 300 },
      data: {
        label: returnDef.metadata.name,
        type: "return",
        icon: returnDef.metadata.icon,
        status: "idle",
        config: {},
      },
    };
    
    const edge: Edge = {
      id: `${entryNode.id}-${returnNode.id}`,
      source: entryNode.id,
      target: returnNode.id,
      type: "step",
      animated: true,
    };
    
    return {
      nodes: [entryNode, returnNode],
      edges: [edge],
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to create default workflow:`, error);
    throw error;
  }
}
