import { BaseNode, NodeType } from "../types/workflow";
import { useNodeRegistry } from "../hooks/useNodeRegistry";

export function useNodeFactory() {
  const { nodes: backendNodes, getNodeByType } = useNodeRegistry();

  const createNode = (
    type: string,
    position: { x: number; y: number },
    id?: string
  ): BaseNode | null => {
    const nodeDefinition = getNodeByType(type);
    
    if (!nodeDefinition) {
      return null;
    }

    const nodeId =
      id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const {
      metadata,
      inputPorts,
      outputPorts,
      capabilities,
      configSchema,
    } = nodeDefinition;

    const getDefaultConfig = () => {
      if (configSchema.properties) {
        const defaults: any = {};
        Object.entries(configSchema.properties).forEach(([key, value]: [string, any]) => {
          if (value.default !== undefined) {
            defaults[key] = value.default;
          }
        });
        return defaults;
      }
      return {};
    };

    return {
      id: nodeId,
      type: metadata.type as NodeType,
      position,
      data: {
        config: getDefaultConfig(),
        inputs: inputPorts.map((port) => ({
          id: port.id,
          label: port.label,
          type: port.type as any,
          required: port.required,
          accepts: ["*"],
          ...(port.defaultValue !== undefined && { defaultValue: port.defaultValue }),
        })),
        outputs: outputPorts.map((port) => ({
          id: port.id,
          label: port.label,
          type: port.type as any,
          description: port.description,
        })),
        validation: { isValid: true, errors: [], warnings: [] },
        ...(capabilities.supportsRetry && { retry: { enabled: false, maxAttempts: 3, delay: 1000, delayUnit: "ms" as const, backoff: "linear" as const } }),
      },
      metadata: {
        label: metadata.name.toLowerCase().replace(/\s+/g, "_"),
        description: metadata.description,
        icon: metadata.icon,
        category: metadata.category as any,
        version: metadata.version,
      },
    };
  };

  return {
    createNode,
    availableTypes: backendNodes.map((n) => n.metadata.type),
  };
}

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
