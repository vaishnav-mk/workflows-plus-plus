'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { DeploymentStatus, DeploymentStep } from "@/config/enums";
import type { DeploymentStateResponse, DeploymentProgress } from "@/lib/api/types";

export type { DeploymentProgress, DeploymentStateResponse };

export interface UseDeploymentSSEOptions {
  deploymentId: string;
  enabled?: boolean;
  onProgress?: (progress: DeploymentProgress) => void;
  onStateChange?: (state: DeploymentStateResponse) => void;
}

export function useDeploymentSSE({
  deploymentId,
  enabled = true,
  onProgress,
  onStateChange,
}: UseDeploymentSSEOptions) {
  const [state, setState] = useState<DeploymentStateResponse | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(async () => {
    if (!enabled || !deploymentId) {
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787/api";
      const base = apiBase.replace(/\/$/, "");
      
      const { tokenStorage } = await import("@/lib/token-storage");
      const token = tokenStorage.getToken();
      const streamUrl = `${base}/deployments/${deploymentId}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = () => {
      };

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
          const newState: DeploymentStateResponse = JSON.parse(event.data);
          setState(newState);
          onStateChange?.(newState);
        } catch (e) {
          console.error('Failed to parse state event:', e);
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        
        if (eventSource.readyState === EventSource.CLOSED) {
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
