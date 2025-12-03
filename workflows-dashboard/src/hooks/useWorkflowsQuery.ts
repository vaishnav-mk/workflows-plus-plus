import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

// ============================================================================
// QUERY HOOKS (GET requests)
// ============================================================================

export function useWorkflowsQuery(page = 1, perPage = 10) {
  return useQuery({
    queryKey: ['workflows', page, perPage],
    queryFn: async () => {
      const result = await apiClient.getWorkflows(page, perPage);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch workflows');
      }
      // Return the full response structure (data + pagination)
      return {
        data: result.data || [],
        pagination: result.pagination,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useWorkersQuery(page = 1, perPage = 10) {
  return useQuery({
    queryKey: ['workers', page, perPage],
    queryFn: async () => {
      const result = await apiClient.getWorkers(page, perPage);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch workers');
      }
      // Return the full response structure (data + pagination)
      return {
        data: result.data || [],
        pagination: result.pagination,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useWorkerQuery(workerId: string) {
  return useQuery({
    queryKey: ['worker', workerId],
    queryFn: async () => {
      const result = await apiClient.getWorker(workerId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch worker');
      }
      return result.data;
    },
    enabled: !!workerId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useWorkerVersionsQuery(workerId: string, page = 1, perPage = 10) {
  return useQuery({
    queryKey: ['worker-versions', workerId, page, perPage],
    queryFn: async () => {
      const result = await apiClient.getWorkerVersions(workerId, page, perPage);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch worker versions');
      }
      // Return the full response structure (data + pagination)
      return {
        data: result.data || [],
        pagination: result.pagination,
      };
    },
    enabled: !!workerId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useWorkerVersionQuery(workerId: string, versionId: string, include?: string) {
  return useQuery({
    queryKey: ['worker-version', workerId, versionId, include],
    queryFn: async () => {
      const result = await apiClient.getWorkerVersion(workerId, versionId, include);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch worker version');
      }
      return result.data;
    },
    enabled: !!workerId && !!versionId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCatalogQuery() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const result = await apiClient.getCatalog();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch catalog');
      }
      return result.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - catalog rarely changes
    refetchOnWindowFocus: false,
  });
}

export function useNodeDefinitionQuery(nodeType: string) {
  return useQuery({
    queryKey: ['node-definition', nodeType],
    queryFn: async () => {
      const result = await apiClient.getNodeDefinition(nodeType);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch node definition');
      }
      return result.data;
    },
    enabled: !!nodeType,
    staleTime: 60 * 60 * 1000, // 1 hour - node definitions rarely change
    refetchOnWindowFocus: false,
  });
}

export function useInstancesQuery(workflowName: string) {
  return useQuery({
    queryKey: ['instances', workflowName],
    queryFn: async () => {
      const result = await apiClient.getInstances(workflowName);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch instances');
      }
      return result.data?.result || result.data || [];
    },
    enabled: !!workflowName,
    staleTime: 30 * 1000, // 30 seconds - instances change frequently
    refetchOnWindowFocus: true,
  });
}

export function useInstanceQuery(workflowName: string, instanceId: string) {
  return useQuery({
    queryKey: ['instance', workflowName, instanceId],
    queryFn: async () => {
      const result = await apiClient.getInstance(workflowName, instanceId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch instance');
      }
      return result.data?.result || result.data;
    },
    enabled: !!workflowName && !!instanceId,
    staleTime: 10 * 1000, // 10 seconds - instance data changes frequently
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Poll every 5 seconds for active instances
  });
}

// ============================================================================
// MUTATION HOOKS (POST/PUT/DELETE requests)
// ============================================================================

export function useCompileWorkflowMutation() {
  return useMutation({
    mutationFn: async (workflow: {
      name: string;
      nodes: any[];
      edges: any[];
      options?: any;
    }) => {
      const result = await apiClient.compileWorkflow(workflow);
      if (!result.success) {
        throw new Error(result.error || 'Failed to compile workflow');
      }
      return result.data;
    },
  });
}

export function useResolveWorkflowTemplatesMutation() {
  return useMutation({
    mutationFn: async (workflow: {
      nodes: any[];
      edges: any[];
    }) => {
      const result = await apiClient.resolveWorkflowTemplates(workflow);
      if (!result.success) {
        throw new Error(result.error || 'Failed to resolve workflow templates');
      }
      return result.data;
    },
  });
}

export function useValidateWorkflowMutation() {
  return useMutation({
    mutationFn: async (workflow: {
      name: string;
      nodes: any[];
      edges: any[];
    }) => {
      const result = await apiClient.validateWorkflow(workflow);
      if (!result.success) {
        throw new Error(result.error || 'Failed to validate workflow');
      }
      return result.data;
    },
  });
}

export function useCreateWorkflowMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workflow: any) => {
      const result = await apiClient.createWorkflow(workflow);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create workflow');
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate workflows query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useDeployWorkflowMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      workflowId,
      options,
    }: {
      workflowId: string;
      options: {
        workflowName?: string;
        subdomain?: string;
        bindings?: any[];
        assets?: Record<string, any>;
        nodes?: any[];
        edges?: any[];
      };
    }) => {
      const result = await apiClient.deployWorkflow(workflowId, options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to deploy workflow');
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate workflows and instances queries
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
  });
}

export function useDeploymentStatusQuery(deploymentId?: string) {
  const enabled = !!deploymentId;

  return useQuery({
    queryKey: ['deployment-status', deploymentId],
    enabled,
    queryFn: async () => {
      if (!deploymentId) {
        throw new Error('Deployment ID is required');
      }
      const result = await apiClient.getDeploymentStatus(deploymentId);
      // Treat "No deployment found" as a valid (non-throwing) state so the UI can show a friendly message
      if (!result.success && result.error !== "No deployment found") {
        throw new Error(result.error || 'Failed to fetch deployment status');
      }
      return result;
    },
  });
}

export function useExecuteNodeMutation() {
  return useMutation({
    mutationFn: async (input: any) => {
      const result = await apiClient.executeNode(input);
      if (!result.success) {
        throw new Error(result.error || 'Failed to execute node');
      }
      return result.data;
    },
  });
}

export function useGenerateWorkflowFromAIMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (options: {
      image?: string;
      imageMimeType?: string;
      text?: string;
    }) => {
      const result = await apiClient.generateWorkflowFromAI(options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate workflow from AI');
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate workflows query
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      const result = await apiClient.logout();
      if (!result.success) {
        throw new Error(result.error || 'Failed to logout');
      }
      return result.data;
    },
  });
}

// Workflow Starters
export function useWorkflowStartersQuery(filter?: { category?: string; difficulty?: string; tags?: string[] }) {
  return useQuery({
    queryKey: ['workflow-starters', filter],
    queryFn: async () => {
      const result = await apiClient.getWorkflowStarters(filter);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch workflow starters');
      }
      return result.data;
    },
  });
}

export function useWorkflowStarterQuery(id: string) {
  return useQuery({
    queryKey: ['workflow-starter', id],
    queryFn: async () => {
      const result = await apiClient.getWorkflowStarter(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch workflow starter');
      }
      return result.data;
    },
    enabled: !!id,
  });
}

export function useStarterCategoriesQuery() {
  return useQuery({
    queryKey: ['starter-categories'],
    queryFn: async () => {
      const result = await apiClient.getStarterCategories();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch starter categories');
      }
      return result.data;
    },
  });
}
