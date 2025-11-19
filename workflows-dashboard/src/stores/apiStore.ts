import { create } from 'zustand';

interface ApiState {
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchNodes: () => Promise<{ data: any; error: string | null }>;
  validateWorkflow: (nodes: any[], edges: any[]) => Promise<{ data: any; error: string | null }>;
  generateCode: (nodes: any[], edges: any[]) => Promise<{ data: any; error: string | null }>;
  deployWorkflow: (nodes: any[], edges: any[], workflowName?: string, subdomain?: string, bindings?: any[], assets?: Record<string, any>) => Promise<{ data: any; error: string | null }>;
  generateWorkflowFromAI: (image?: File, text?: string) => Promise<{ data: any; error: string | null }>;
  getWorkflows: () => Promise<{ data: any; error: string | null }>;
  getInstances: (workflowName: string) => Promise<{ data: any; error: string | null }>;
  getInstance: (workflowName: string, instanceId: string) => Promise<{ data: any; error: string | null }>;
}

const API_BASE = (process as any).env?.NEXT_PUBLIC_API_BASE || 'http://localhost:8787/api';

export const useApiStore = create<ApiState>((set, get) => ({
  loading: false,
  error: null,
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  fetchNodes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/nodes`);
      const data = await response.json();
      set({ loading: false });
      return { data, error: null };
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ loading: false, error: errorMessage });
      return { data: null, error: errorMessage };
    }
  },
  
  validateWorkflow: async (nodes, edges) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/workflows/validate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: "Generated Workflow",
          nodes: nodes.map(n => ({ id: n.id, type: n.data?.type, config: n.data?.config })),
          edges: edges.map((e, index) => ({ 
            id: e.id || `edge-${e.source}-${e.target}-${index}`,
            source: e.source, 
            target: e.target 
          }))
        })
      });
      const data = await response.json();
      set({ loading: false });
      return { data, error: null };
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ loading: false, error: errorMessage });
      return { data: null, error: errorMessage };
    }
  },
  
  generateCode: async (nodes, edges) => {
    set({ loading: true, error: null });
    try {
      const workflowData = {
        name: "Generated Workflow",
        nodes: nodes.map(n => ({ id: n.id, type: n.data?.type, config: n.data?.config })),
        edges: edges.map((e, index) => ({ 
          id: e.id || `edge-${e.source}-${e.target}-${index}`,
          source: e.source, 
          target: e.target 
        }))
      };
      
      const response = await fetch(`${API_BASE}/workflows/preview`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(workflowData)
      });
      const data = await response.json();
      set({ loading: false });
      return { data, error: null };
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ loading: false, error: errorMessage });
      return { data: null, error: errorMessage };
    }
  },
  
  deployWorkflow: async (nodes, edges, workflowName = 'my-workflow', subdomain, bindings, assets) => {
    set({ loading: true, error: null });
    try {
      const workflowData = {
        name: workflowName,
        nodes: nodes.map(n => ({ 
          id: n.id, 
          type: n.data?.type || n.type, 
          position: n.position,
          data: { 
            label: n.data?.label || n.label,
            type: n.data?.type || n.type,
            config: n.data?.config || n.config,
            description: n.data?.description,
            icon: n.data?.icon,
            status: n.data?.status || 'idle'
          }
        })),
        edges: edges.map((e, index) => ({ 
          id: e.id || `edge-${e.source}-${e.target}-${index}`,
          source: e.source, 
          target: e.target,
          type: e.type || 'default'
        }))
      };
      
      const response = await fetch(`${API_BASE}/workflows`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(workflowData)
      });
      const createData = await response.json();
      
      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create workflow');
      }

      const createdWorkflow = createData.data;
      const actualWorkflowId = createdWorkflow.id;
      const actualWorkflowName = createdWorkflow.name || workflowName;
      
      const deployResponse = await fetch(`${API_BASE}/workflows/${actualWorkflowId}/deploy`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workflowName: actualWorkflowName,
          subdomain,
          bindings,
          assets
        })
      });
      const deployData = await deployResponse.json();
      
      set({ loading: false });
      return { data: deployData, error: null };
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ loading: false, error: errorMessage });
      return { data: null, error: errorMessage };
    }
  },

  getWorkflows: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/workflows`);
      const data = await response.json();
      set({ loading: false });
      return { data, error: null };
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ loading: false, error: errorMessage });
      return { data: null, error: errorMessage };
    }
  },

  getInstances: async (workflowName) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/workflows/${workflowName}/instances`);
      const data = await response.json();
      set({ loading: false });
      return { data, error: null };
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ loading: false, error: errorMessage });
      return { data: null, error: errorMessage };
    }
  },

  getInstance: async (workflowName, instanceId) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/workflows/${workflowName}/instances/${instanceId}`);
      const data = await response.json();
      set({ loading: false });
      return { data, error: null };
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ loading: false, error: errorMessage });
      return { data: null, error: errorMessage };
    }
  },

  generateWorkflowFromAI: async (image, text) => {
    set({ loading: true, error: null });
    try {
      let requestBody: any = {};
      
      if (image) {
        const reader = new FileReader();
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });

        requestBody.image = imageBase64;
        requestBody.imageMimeType = image.type || 'image/png';
      }
      
      if (text) {
        requestBody.text = text;
      }

      if (!requestBody.image && !requestBody.text) {
        throw new Error('Either image or text must be provided');
      }

      const response = await fetch(`${API_BASE}/workflows/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to generate workflow');
      }

      set({ loading: false });
      return { data: data.data, error: null };
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ loading: false, error: errorMessage });
      return { data: null, error: errorMessage };
    }
  }
}));
