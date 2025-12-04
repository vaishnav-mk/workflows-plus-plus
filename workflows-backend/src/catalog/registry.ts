/**
 * Node Registry - Manages node definitions and provides catalog
 */

import * as NodeLibrary from "../library";
import { WorkflowNodeDefinition } from "../core/types";
import { NodeCategory } from "../core/enums";
import { DEFAULT_VALUES } from "../core/constants";

export class NodeRegistry {
  private static nodes: Map<string, WorkflowNodeDefinition<unknown>> = new Map();

  static {
    const allNodes = [
      NodeLibrary.EntryNode,
      NodeLibrary.ReturnNode,
      NodeLibrary.SleepNode,
      NodeLibrary.KVGetNode,
      NodeLibrary.KVPutNode,
      NodeLibrary.D1QueryNode,
      NodeLibrary.HttpRequestNode,
      NodeLibrary.TransformNode,
      NodeLibrary.ValidateNode,
      NodeLibrary.ConditionalRouterNode,
      NodeLibrary.ForEachNode,
      NodeLibrary.WaitEventNode,
      NodeLibrary.WorkersAINode,
      NodeLibrary.MCPToolInputNode,
      NodeLibrary.MCPToolOutputNode,
    ];

    allNodes.forEach(node => {
      // Type assertion needed because nodes have specific config types but we store as unknown
      NodeRegistry.nodes.set(node.metadata.type, node as WorkflowNodeDefinition<unknown>);
    });
  }

  /**
   * Get all nodes
   */
  static getAllNodes(): WorkflowNodeDefinition<unknown>[] {
    return Array.from(NodeRegistry.nodes.values());
  }

  /**
   * Get node by type
   */
  static getNode(type: string): WorkflowNodeDefinition<unknown> | null {
    return NodeRegistry.nodes.get(type) || null;
  }

  /**
   * Get nodes by category
   */
  static getNodesByCategory(category: NodeCategory): WorkflowNodeDefinition[] {
    return Array.from(NodeRegistry.nodes.values()).filter(
      node => node.metadata.category === category
    );
  }

  /**
   * Get lightweight catalog for frontend (<5KB)
   */
  static getCatalog(): Array<{
    type: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    color?: string;
    tags?: string[];
  }> {
    return Array.from(NodeRegistry.nodes.values()).map(node => ({
      type: node.metadata.type,
      name: node.metadata.name,
      description: node.metadata.description,
      category: node.metadata.category,
      icon: node.metadata.icon,
      color: node.metadata.color,
      tags: node.metadata.tags,
    }));
  }

  /**
   * Get catalog JSON (for API)
   */
  static getCatalogJSON(): string {
    const catalog = NodeRegistry.getCatalog();
    const json = JSON.stringify(catalog);
    
    if (json.length > DEFAULT_VALUES.CATALOG_MAX_SIZE_KB * 1024) {
      console.warn(`Catalog size (${json.length} bytes) exceeds limit (${DEFAULT_VALUES.CATALOG_MAX_SIZE_KB * 1024} bytes)`);
    }
    
    return json;
  }
}



