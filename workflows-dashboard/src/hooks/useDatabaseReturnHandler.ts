import { useEffect, useRef } from "react";
import type { Node } from "reactflow";
import { parseUrlParams, cleanUrlParams } from "@/utils/url-parser";

interface UseDatabaseReturnHandlerProps {
  nodes: Node[];
  updateNode: (nodeId: string, updates: Partial<Node["data"]>) => void;
  setSelectedNode: (node: Node | null) => void;
  workflowId: string | null;
  mcpEnabled: boolean;
}

export function useDatabaseReturnHandler({
  nodes,
  updateNode,
  setSelectedNode,
  workflowId,
  mcpEnabled
}: UseDatabaseReturnHandlerProps) {
  const processedReturnRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || nodes.length === 0) return;

    const searchString = window.location.search;
    const params = parseUrlParams(searchString);
    const { databaseId, query, returnNodeId } = params;

    if (!databaseId || !query || !returnNodeId) return;

    const returnKey = `${returnNodeId}-${databaseId}-${query}`;
    if (processedReturnRef.current === returnKey) return;

    const d1Node = nodes.find((n) => {
      const nodeType = n.data?.type || n.type;
      return n.id === returnNodeId && nodeType === "d1-query";
    });

    if (d1Node) {
      const currentConfig = (d1Node.data &&
        typeof d1Node.data === "object" &&
        "config" in d1Node.data &&
        typeof d1Node.data.config === "object" &&
        d1Node.data.config
        ? d1Node.data.config
        : {}) as Record<string, unknown>;

      let decodedQuery: string;
      try {
        decodedQuery = decodeURIComponent(query);
      } catch {
        decodedQuery = query;
      }

      const newConfig = {
        ...currentConfig,
        database_id: databaseId,
        database: params.databaseName || currentConfig.database || "DB",
        query: decodedQuery
      };

      updateNode(returnNodeId, {
        ...d1Node.data,
        config: newConfig
      });

      processedReturnRef.current = returnKey;
      setSelectedNode(d1Node);

      const newParams = cleanUrlParams(new URLSearchParams(window.location.search));
      const id = newParams.get("id") || workflowId;
      if (id) {
        newParams.set("id", id);
      }
      if (mcpEnabled) {
        newParams.set("mcp", "1");
      }

      const finalUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.replaceState({}, "", finalUrl);
    }
  }, [nodes, updateNode, setSelectedNode, workflowId, mcpEnabled]);
}

