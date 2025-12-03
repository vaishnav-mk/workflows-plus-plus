'use client';

import React, { createContext, useContext, useCallback, ReactNode, useMemo } from 'react';
import { useCatalogQuery, useNodeDefinitionQuery } from '../hooks/useWorkflowsQuery';
import { apiClient } from '../lib/api-client';

interface NodeCatalogItem {
  type: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color?: string;
  tags?: string[];
}

interface NodeDefinition {
  metadata: {
    type: string;
    name: string;
    description: string;
    category: string;
    version: string;
    icon: string;
    color?: string;
    tags?: string[];
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
  presetOutput?: any;
}

interface NodeRegistryContextValue {
  catalog: NodeCatalogItem[];
  loading: boolean;
  error: string | null;
  getNodeByType: (type: string) => Promise<NodeDefinition | null>;
  getNodesByCategory: (category: string) => NodeCatalogItem[];
  refetch: () => Promise<void>;
}

const NodeRegistryContext = createContext<NodeRegistryContextValue | null>(null);

export function NodeRegistryProvider({ children }: { children: ReactNode }) {
  const { data: catalog = [], isLoading: loading, error: queryError, refetch } = useCatalogQuery();

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  const getNodeByType = useCallback(
    async (type: string): Promise<NodeDefinition | null> => {
      try {
        const result = await apiClient.getNodeDefinition(type);
        if (result.success && result.data) {
          return result.data;
        }
        return null;
      } catch (error) {
        console.error(`Failed to fetch node definition for ${type}:`, error);
        return null;
      }
    },
    []
  );

  const getNodesByCategory = useCallback(
    (category: string) => {
      return catalog.filter((item) => item.category === category);
    },
    [catalog]
  );

  const refetchCatalog = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value: NodeRegistryContextValue = useMemo(() => ({
    catalog,
    loading,
    error,
    getNodeByType,
    getNodesByCategory,
    refetch: refetchCatalog,
  }), [catalog, loading, error, getNodeByType, getNodesByCategory, refetchCatalog]);

  return (
    <NodeRegistryContext.Provider value={value}>
      {children}
    </NodeRegistryContext.Provider>
  );
}

export function useNodeRegistry(): NodeRegistryContextValue {
  const context = useContext(NodeRegistryContext);
  if (!context) {
    throw new Error('useNodeRegistry must be used within NodeRegistryProvider');
  }
  return context;
}

// Export hook for getting node definitions
export { useNodeDefinitionQuery };

