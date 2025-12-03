import { BaseNode, NodeType } from "../types/workflow";

export class NodeFactory {
  private static getBackendNode(type: string) {
    return null;
  }

  static createNode(
    type: NodeType,
    position: { x: number; y: number },
    id?: string
  ): BaseNode {
    const nodeId =
      id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: nodeId,
      type,
      position,
      data: {
        config: {},
        inputs: [
          {
            id: "trigger",
            label: "Execute",
            type: "any",
            required: true,
            accepts: ["*"],
          },
        ],
        outputs: [],
        validation: { isValid: true, errors: [], warnings: [] },
      },
      metadata: {
        label: type,
        description: "",
        icon: "Circle",
        category: "control",
        version: "1.0.0",
      },
    };
  }
}
