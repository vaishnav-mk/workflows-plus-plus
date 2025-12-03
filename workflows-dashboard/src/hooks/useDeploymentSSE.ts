'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface DeploymentProgress {
  step: string;
  message: string;
  progress: number;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface DeploymentState {
  deploymentId: string;
  workflowId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: DeploymentProgress[];
  result?: {
    workerUrl?: string;
    mcpUrl?: string;
    versionId?: string;
    instanceId?: string;
    deploymentId?: string;
    status: string;
    bindings?: Array<{
      name: string;
      type: string;
    }>;
  };
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface UseDeploymentSSEOptions {
  deploymentId: string;
  enabled?: boolean;
  onProgress?: (progress: DeploymentProgress) => void;
  onStateChange?: (state: DeploymentState) => void;
}

export function useDeploymentSSE({
  deploymentId,
  enabled = true,
  onProgress,
  onStateChange,
}: UseDeploymentSSEOptions) {
  const [state, setState] = useState<DeploymentState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!enabled || !deploymentId) {
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // Use the same API base as the main client so everything goes through the Worker
      // NOTE: API_BASE already includes `/api`, so we don't repeat it here
      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787/api";
      const base = apiBase.replace(/\/$/, "");
      const streamUrl = `${base}/deployments/${deploymentId}/stream`;

      const eventSource = new EventSource(streamUrl, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      // Default message handler (keepalive etc.)
      eventSource.onmessage = () => {
        // no-op
      };

      // Handle custom events
      eventSource.addEventListener('progress', (event) => {
        try {
          const progress: DeploymentProgress = JSON.parse(event.data);
          setState((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              progress: [...prev.progress, progress],
            };
          });
          onProgress?.(progress);
        } catch (e) {
          console.error('Failed to parse progress event:', e);
        }
      });

      eventSource.addEventListener('state', (event) => {
        try {
          const newState: DeploymentState = JSON.parse(event.data);
          setState(newState);
          onStateChange?.(newState);
        } catch (e) {
          console.error('Failed to parse state event:', e);
        }
      });

      eventSource.onerror = (err) => {
        setIsConnected(false);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          // Connection closed - try to reconnect
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setError('Failed to connect to deployment stream after multiple attempts');
          }
        } else {
          setError('Connection error occurred');
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup SSE connection');
      setIsConnected(false);
    }
  }, [deploymentId, enabled, onProgress, onStateChange]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled && deploymentId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, deploymentId, connect, disconnect]);

  return {
    state,
    isConnected,
    error,
    reconnect: connect,
    disconnect,
  };
}

