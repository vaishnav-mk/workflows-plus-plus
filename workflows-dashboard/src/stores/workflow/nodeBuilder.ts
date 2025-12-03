/**
 * Node Builder
 * Builds ReactFlow nodes from backend node definitions
 * NO hardcoded values - everything comes from backend
 */

import type { Node, Edge } from "reactflow";
import { apiClient } from "@/lib/api-client";
import { generateWorkflowId } from "@/utils/id-generator";

const LOG_PREFIX = '[NodeBuilder]';

interface NodeDefinition {
  metadata: {
    type: string;
    name: string;
    icon: string;
    color?: string;
  };
}

/**
 * Create a ReactFlow node from backend node definition
 */
export async function createNodeFromBackend(
  nodeType: string,
  position: { x: number; y: number },
  config?: Record<string, unknown>
): Promise<Node> {
  
  // Fetch node definition from backend
  const result = await apiClient.getNodeDefinition(nodeType);
  
  if (!result.success || !result.data) {
    console.error(`${LOG_PREFIX} Failed to fetch node definition for:`, nodeType);
    throw new Error(`Failed to fetch node definition for ${nodeType}`);
  }
  
  const nodeDef = result.data as NodeDefinition;
  const metadata = nodeDef.metadata;
  
  // Generate standardized ID based on node type
  // For now, use a temporary ID that will be standardized during compilation
  // Transform nodes: step_transform_{index}, Entry: step_entry_0, Return: step_return_{last}
  const { nodes } = await import("@/stores/workflow/nodesStore").then(m => m.useNodesStore.getState());
  const transformCount = nodes.filter(n => n.data?.type === 'transform').length;
  const nodeId = nodeType === 'entry' 
    ? 'step_entry_0'
    : nodeType === 'transform'
    ? `step_transform_${transformCount}`
    : nodeType === 'return'
    ? `step_return_${nodes.length}` // Will be updated to last index during compilation
    : `step_${nodeType}_${nodes.length}`;
  
  return {
    id: nodeId,
    type: "default", // Use default ReactFlow node type
    position,
    data: {
      label: metadata.name,
      type: nodeType,
      icon: metadata.icon,
      status: "idle",
      config: config || {},
    },
  };
}

/**
 * Create entry and return nodes from backend
 */
export async function createDefaultWorkflowNodes(): Promise<{
  nodes: Node[];
  edges: Edge[];
}> {
  
  try {
    // Fetch entry and return node definitions from backend
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
    
    // Calculate centered positions - use a large canvas width for centering
    // ReactFlow will handle viewport centering via fitView
    const nodeWidth = 200;
    const canvasWidth = 2000; // Use a fixed large canvas width for consistent centering
    const centerX = (canvasWidth / 2) - (nodeWidth / 2);
    
    // Create nodes with standardized IDs
    const entryNode: Node = {
      id: 'step_entry_0',
      type: "default", // Use default ReactFlow node type
      position: { x: centerX, y: 100 },
      data: {
        label: entryDef.metadata.name,
        type: "entry", // This is the node type (entry/return/etc)
        icon: entryDef.metadata.icon,
        status: "idle",
        config: {},
      },
    };
    
    const returnNode: Node = {
      id: 'step_return_1', // Will be updated to correct last index during compilation
      type: "default", // Use default ReactFlow node type
      position: { x: centerX, y: 300 },
      data: {
        label: returnDef.metadata.name,
        type: "return", // This is the node type (entry/return/etc)
        icon: returnDef.metadata.icon,
        status: "idle",
        config: {},
      },
    };
    
    const edge: Edge = {
      id: `${entryNode.id}-${returnNode.id}`,
      source: entryNode.id,
      target: returnNode.id,
      type: "step", // Use step edges for straight horizontal/vertical lines
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

