import { useCallback } from "react";
import type { Node } from "reactflow";
import { apiClient } from "@/lib/api-client";

interface UseMCPToggleProps {
  nodes: Node[];
  setMCPEnabled: (enabled: boolean) => void;
  setNodes: (nodes: Node[]) => void;
}

export function useMCPToggle({
  nodes,
  setMCPEnabled,
  setNodes
}: UseMCPToggleProps) {
  const handleMCPToggle = useCallback(
    async (enabled: boolean) => {
      setMCPEnabled(enabled);

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (enabled) {
          params.set("mcp", "1");
        } else {
          params.delete("mcp");
        }
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?${params.toString()}`
        );
      }

      const updatedNodes = await Promise.all(
        nodes.map(async (node) => {
          const nodeType = node.data?.type;

          if (enabled) {
            if (nodeType === "entry") {
              const def = await apiClient.getNodeDefinition("mcp-tool-input");
              if (def.success && def.data) {
                const nodeDef = def.data as {
                  metadata?: { name?: string; icon?: string };
                };
                return {
                  ...node,
                  data: {
                    ...node.data,
                    type: "mcp-tool-input",
                    label: nodeDef.metadata?.name,
                    icon: nodeDef.metadata?.icon
                  }
                };
              }
            } else if (nodeType === "return") {
              const def = await apiClient.getNodeDefinition("mcp-tool-output");
              if (def.success && def.data) {
                const nodeDef = def.data as {
                  metadata?: { name?: string; icon?: string };
                };
                return {
                  ...node,
                  data: {
                    ...node.data,
                    type: "mcp-tool-output",
                    label: nodeDef.metadata?.name,
                    icon: nodeDef.metadata?.icon
                  }
                };
              }
            }
          } else {
            if (nodeType === "mcp-tool-input") {
              const def = await apiClient.getNodeDefinition("entry");
              if (def.success && def.data) {
                const nodeDef = def.data as {
                  metadata?: { name?: string; icon?: string };
                };
                return {
                  ...node,
                  data: {
                    ...node.data,
                    type: "entry",
                    label: nodeDef.metadata?.name,
                    icon: nodeDef.metadata?.icon
                  }
                };
              }
            } else if (nodeType === "mcp-tool-output") {
              const def = await apiClient.getNodeDefinition("return");
              if (def.success && def.data) {
                const nodeDef = def.data as {
                  metadata?: { name?: string; icon?: string };
                };
                return {
                  ...node,
                  data: {
                    ...node.data,
                    type: "return",
                    label: nodeDef.metadata?.name,
                    icon: nodeDef.metadata?.icon
                  }
                };
              }
            }
          }

          return node;
        })
      );

      setNodes(updatedNodes);
    },
    [nodes, setMCPEnabled, setNodes]
  );

  return { handleMCPToggle };
}

