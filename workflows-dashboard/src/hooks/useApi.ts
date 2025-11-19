import { useState, useCallback } from 'react';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const API_BASE = (process as any).env?.NEXT_PUBLIC_API_BASE || 'http://localhost:8787/api';

  const fetchNodes = useCallback(async (): Promise<ApiResponse<any>> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/nodes`);
      const data = await response.json();
      return { data, error: undefined, loading: false };
    } catch (error) {
      return { data: undefined, error: (error as Error).message, loading: false };
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const fetchWorkers = useCallback(async (page = 1, per_page = 10): Promise<ApiResponse<any>> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/workers?page=${page}&per_page=${per_page}`);
      const data = await response.json();
      return { data, error: undefined, loading: false };
    } catch (error) {
      return { data: undefined, error: (error as Error).message, loading: false };
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const fetchWorker = useCallback(async (workerId: string): Promise<ApiResponse<any>> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/workers/${workerId}`);
      const data = await response.json();
      return { data, error: undefined, loading: false };
    } catch (error) {
      return { data: undefined, error: (error as Error).message, loading: false };
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const fetchWorkerVersions = useCallback(async (workerId: string, page = 1, per_page = 10): Promise<ApiResponse<any>> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/workers/${workerId}/versions?page=${page}&per_page=${per_page}`);
      const data = await response.json();
      return { data, error: undefined, loading: false };
    } catch (error) {
      return { data: undefined, error: (error as Error).message, loading: false };
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const fetchWorkerVersion = useCallback(async (workerId: string, versionId: string, include?: string): Promise<ApiResponse<any>> => {
    setLoading(true);
    try {
      const qs = include ? `?include=${encodeURIComponent(include)}` : '';
      const response = await fetch(`${API_BASE}/workers/${workerId}/versions/${versionId}${qs}`);
      const data = await response.json();
      return { data, error: undefined, loading: false };
    } catch (error) {
      return { data: undefined, error: (error as Error).message, loading: false };
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const validateWorkflow = useCallback(async (nodes: any[], edges: any[]): Promise<ApiResponse<any>> => {
    setLoading(true);
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
      return { data, error: undefined, loading: false };
    } catch (error) {
      return { data: undefined, error: (error as Error).message, loading: false };
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const generateCode = useCallback(async (nodes: any[], edges: any[]): Promise<ApiResponse<any>> => {
    setLoading(true);
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
      return { data, error: undefined, loading: false };
    } catch (error) {
      return { data: undefined, error: (error as Error).message, loading: false };
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  return {
    loading,
    fetchNodes,
    validateWorkflow,
    generateCode,
    fetchWorkers,
    fetchWorker,
    fetchWorkerVersions,
    fetchWorkerVersion
  };
}
