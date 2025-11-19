import { useState, useEffect, useCallback } from "react";

interface NodeDefinition {
  metadata: {
    type: string;
    name: string;
    description: string;
    category: string;
    version: string;
    icon: string;
    color: string;
    tags: string[];
  };
  configSchema: any;
  inputPorts: Array<{
    id: string;
    label: string;
    type: string;
    description: string;
    required: boolean;
    defaultValue?: any;
  }>;
  outputPorts: Array<{
    id: string;
    label: string;
    type: string;
    description: string;
    required: boolean;
  }>;
  bindings: Array<{
    type: string;
    name: string;
    required: boolean;
    description: string;
  }>;
  capabilities: {
    playgroundCompatible: boolean;
    supportsRetry: boolean;
    isAsync: boolean;
    canFail: boolean;
  };
  examples: Array<{
    name: string;
    description: string;
    config: any;
    expectedOutput?: any;
  }>;
  presetOutput?: any; // Example output structure for state visualization
}

interface UseNodeRegistryReturn {
  nodes: NodeDefinition[];
  loading: boolean;
  error: string | null;
  getNodeByType: (type: string) => NodeDefinition | undefined;
  getNodesByCategory: (category: string) => NodeDefinition[];
  refetch: () => Promise<void>;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787/api";

export function useNodeRegistry(): UseNodeRegistryReturn {
  const [nodes, setNodes] = useState<NodeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/nodes`);
      const data = await response.json();

      if (data.success && data.data) {
        setNodes(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch nodes");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch nodes";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(
    () => {
      fetchNodes();
    },
    [fetchNodes]
  );

  const getNodeByType = useCallback(
    (type: string) => {
      return nodes.find(node => node.metadata.type === type);
    },
    [nodes]
  );

  const getNodesByCategory = useCallback(
    (category: string) => {
      return nodes.filter(node => node.metadata.category === category);
    },
    [nodes]
  );

  return {
    nodes,
    loading,
    error,
    getNodeByType,
    getNodesByCategory,
    refetch: fetchNodes
  };
}
