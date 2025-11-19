import { zodToJsonSchema } from "zod-to-json-schema";
import { EntryNode } from "./definitions/entry.node";
import { ReturnNode } from "./definitions/return.node";
import { HttpRequestNode } from "./definitions/http-request.node";
import { TransformNode } from "./definitions/transform.node";
import { SleepNode } from "./definitions/sleep.node";
import { ConditionalInlineNode } from "./definitions/conditional-inline.node";
import { ConditionalRouterNode } from "./definitions/conditional-router.node";
import { ValidateNode } from "./definitions/validate.node";
import { ForEachNode } from "./definitions/for-each.node";
import { WaitEventNode } from "./definitions/wait-event.node";
import { KVGetNode } from "./definitions/kv-get.node";
import { KVPutNode } from "./definitions/kv-put.node";
import { D1QueryNode } from "./definitions/d1-query.node";
import { MCPToolInputNode } from "./definitions/mcp-tool-input.node";
import { MCPToolOutputNode } from "./definitions/mcp-tool-output.node";
import { AIGatewayNode } from "./definitions/ai-gateway.node";

export class NodeRegistry {
  private static nodes = [
    EntryNode,
    ReturnNode,
    HttpRequestNode,
    TransformNode,
    SleepNode,
    ConditionalInlineNode,
    ConditionalRouterNode,
    ValidateNode,
    ForEachNode,
    WaitEventNode,
    KVGetNode,
    KVPutNode,
    D1QueryNode,
    MCPToolInputNode,
    MCPToolOutputNode,
    AIGatewayNode
  ];

  static getAllNodes() {
    return this.nodes;
  }

  static getNodeByType(type: string) {
    return this.nodes.find(n => n.metadata.type === type);
  }

  static getNodesByCategory(category: string) {
    return this.nodes.filter(n => n.metadata.category === category);
  }

  static getPlaygroundCompatibleNodes() {
    return this.nodes.filter(n => n.capabilities.playgroundCompatible);
  }

  static getNodesRequiringBindings() {
    return this.nodes.filter(n => n.bindings.length > 0);
  }

  static toJSON() {
    return this.nodes.map(node => ({
      metadata: node.metadata,
      configSchema: zodToJsonSchema(node.configSchema),
      inputPorts: node.inputPorts,
      outputPorts: node.outputPorts,
      bindings: node.bindings,
      capabilities: node.capabilities,
      examples: node.examples
    }));
  }
}
