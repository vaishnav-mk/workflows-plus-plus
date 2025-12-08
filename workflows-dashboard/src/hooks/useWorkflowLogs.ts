import { useState, useEffect, useCallback, useRef } from "react";

interface WorkflowLogMessage {
  type:
    | "WF_NODE_START"
    | "WF_NODE_END"
    | "WF_NODE_ERROR"
    | "WF_STATUS_UPDATE";
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  timestamp?: number;
  instanceId?: string;
  output?: any;
  error?: string;
  success?: boolean;
  status?: any;
}

interface UseWorkflowLogsOptions {
  workflowName: string;
  instanceId: string;
  enabled?: boolean;
  onStatusUpdate?: (status: any) => void;
}

interface UseWorkflowLogsReturn {
  logs: WorkflowLogMessage[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  clearLogs: () => void;
  reconnect: () => void;
}

export function useWorkflowLogs({
  workflowName,
  instanceId,
  enabled = true,
  onStatusUpdate
}: UseWorkflowLogsOptions): UseWorkflowLogsReturn {
  const [logs, setLogs] = useState<WorkflowLogMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLog, setLastLog] = useState<WorkflowLogMessage | null>(null);

  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false);
  const lastConnectTimeRef = useRef(0);
  
  const enabledRef = useRef(enabled);
  const workflowNameRef = useRef(workflowName);
  const instanceIdRef = useRef(instanceId);
  
  useEffect(() => {
    enabledRef.current = enabled;
    workflowNameRef.current = workflowName;
    instanceIdRef.current = instanceId;
  }, [enabled, workflowName, instanceId]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const connect = useCallback(
    async () => {
      if (!enabledRef.current || !workflowNameRef.current || !instanceIdRef.current) {
        return;
      }

      if (isConnectingRef.current) {
        return;
      }

      const now = Date.now();
      if (now - lastConnectTimeRef.current < 1000) {
        return;
      }
      lastConnectTimeRef.current = now;

      if (websocketRef.current) {
        websocketRef.current.close();
      }

      isConnectingRef.current = true;
      setIsConnecting(true);
      setError(null);

      try {
        const tailUrl = `http://localhost:8787/api/workflows/${workflowNameRef.current}/instances/${instanceIdRef.current}/logs/tail-url`;
        
        const response = await fetch(tailUrl, {
          credentials: "include"
        });
        const data = await response.json();

        if (!data.success) {
          setError("Failed to create tail session");
          setIsConnecting(false);
          return;
        }

        const ws = new WebSocket(data.data.url, "trace-v1");
        websocketRef.current = ws;

        ws.onopen = () => {
          isConnectingRef.current = false;
          setIsConnected(true);
          setIsConnecting(false);
          reconnectAttempts.current = 0;
          ws.send(JSON.stringify({ debug: true }));
        };

        ws.onmessage = async (event) => {
          try {
            let messageText: string;
            
            if (event.data instanceof Blob) {
              messageText = await event.data.text();
            } else {
              messageText = event.data;
            }
            
            const tailEvent = JSON.parse(messageText);

            if (tailEvent.logs && Array.isArray(tailEvent.logs)) {
              for (const log of tailEvent.logs) {
                if (log.message && log.message[0]) {
                  try {
                    const parsed = JSON.parse(log.message[0]);
                    if (parsed.type?.startsWith("WF_NODE_")) {
                      setLogs((prev) => {
                        const newLogs = [...prev, parsed];
                        return newLogs;
                      });
                      setLastLog(parsed);
                    }
                  } catch {
                    // Ignore parsing errors
                  }
                }
              }
            }
          } catch {
            // Ignore message errors
          }
        };

        ws.onerror = () => {
          isConnectingRef.current = false;
          setIsConnected(false);
          setIsConnecting(false);

          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts.current),
              30000
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setError("Failed to connect to log stream after multiple attempts");
          }
        };

        ws.onclose = () => {
          isConnectingRef.current = false;
          setIsConnected(false);
          setIsConnecting(false);
        };
      } catch {
        isConnectingRef.current = false;
        setError("Failed to setup tail connection");
        setIsConnecting(false);
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    isConnectingRef.current = false;
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const reconnect = useCallback(
    () => {
      disconnect();
      reconnectAttempts.current = 0;
      setError(null);
      connect();
    },
    [connect, disconnect]
  );

  useEffect(
    () => {
      if (enabled) {
        connect();
      } else {
        disconnect();
      }

      return () => {
        disconnect();
      };
    },
    [enabled, workflowName, instanceId, connect, disconnect]
  );

  useEffect(
    () => {
      if (!lastLog) {
        return;
      }

      if (lastLog.type === "WF_NODE_START" || lastLog.type === "WF_NODE_END") {
        const fetchStatus = async () => {
          try {
            const { apiClient } = await import('../lib/api-client');
            const result = await apiClient.getInstance(workflowName, instanceId);
            
            if (result.success && onStatusUpdate) {
              onStatusUpdate(result.data);
            }
          } catch {
            // Silently fail
          }
        };

        const timeout = setTimeout(fetchStatus, 500);
        return () => {
          clearTimeout(timeout);
        };
      }
    },
    [lastLog, workflowName, instanceId, onStatusUpdate]
  );

  return {
    logs,
    isConnected,
    isConnecting,
    error,
    clearLogs,
    reconnect
  };
}
