"use client";

import { Position } from "reactflow";
import type { NodeProps } from "reactflow";
import { X, Code } from "lucide-react";
import { useMemo } from "react";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useNodeRegistry } from "@/hooks/useNodeRegistry";
import {
  WORKFLOW_DEFAULT_MAX_RETRIES,
  WORKFLOW_DEFAULT_TIMEOUT_MS
} from "@/config/workflowDefaults";
import { WORKFLOW_NODE_ICON_MAP } from "@/config/workflow-node-icons";
import { getConfigEntries } from "@/utils/workflow-node";
import { NodeHeader } from "./NodeHeader";
import { NodeRetryInfo } from "./NodeRetryInfo";
import { NodeHandles } from "./NodeHandles";

export function WorkflowNode({ id, data, selected }: NodeProps) {
  const { removeNode } = useWorkflowStore();
  const { catalog } = useNodeRegistry();

  const catalogItem = useMemo(
    () => catalog.find((item) => item.type === data.type),
    [catalog, data.type]
  );

  const isSystemNode = data.type === "entry" || data.type === "return";

  const borderColor = useMemo(() => {
    const status =
      typeof data.status === "string" ? data.status.toLowerCase() : "";
    if (status === "completed" || status === "success") return "#10b981";
    if (status === "failed" || status === "error") return "#ef4444";
    if (status === "running") return "#3b82f6";
    if (status === "pending") return "#fbbf24";
    return catalogItem?.color || "#e5e7eb";
  }, [data.status, catalogItem?.color]);

  const iconName =
    typeof data.icon === "string"
      ? data.icon
      : catalogItem?.icon || "Code";
  const Icon = WORKFLOW_NODE_ICON_MAP[iconName] || Code;

  const nodeName =
    typeof data.label === "string" && data.label.length > 0
      ? data.label
      : catalogItem?.name ||
        (typeof data.type === "string" ? data.type : "Node");

  const nodeConfigItems = useMemo(
    () => getConfigEntries((data as any)?.config || {}),
    [data]
  );

  const retryConfig =
    (data as any)?.config?.retry || (data as any)?.retry || {};
  const maxRetries =
    retryConfig.attempts ??
    retryConfig.maxAttempts ??
    WORKFLOW_DEFAULT_MAX_RETRIES;
  const timeoutMs =
    retryConfig.timeoutMs ??
    retryConfig.timeout ??
    WORKFLOW_DEFAULT_TIMEOUT_MS;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Delete this node?")) {
      removeNode(id);
    }
  };

  return (
    <div className="relative group">
      <NodeHeader icon={Icon} nodeName={nodeName} borderColor={borderColor} />

      <div
        className="react-flow__node-workflow"
        style={{
          background: isSystemNode ? "#f3f4f6" : "#ffffff",
          border: `2px solid ${borderColor}`,
          borderRadius: "8px",
          width: "260px",
          boxShadow: selected
            ? "0 0 0 2px #3b82f6"
            : "0 1px 3px rgba(0,0,0,0.1)",
          position: "relative"
        }}
      >
        {!isSystemNode && (
          <button
            onClick={handleDelete}
            title="Delete node"
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              opacity: 0,
              transition: "opacity 0.2s",
              zIndex: 10
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
          >
            <X className="w-3 h-3" />
          </button>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            position: "relative"
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "12px",
              flex: 1,
              minWidth: 0
            }}
          >
            {nodeConfigItems.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}
              >
                {nodeConfigItems.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px"
                    }}
                  >
                    <div
                      style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}
                    >
                      {item.key}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#374151",
                        lineHeight: "1.4",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        wordBreak: "break-word"
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : catalogItem?.description ? (
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  lineHeight: "1.4",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  wordBreak: "break-word"
                }}
              >
                {catalogItem.description}
              </div>
            ) : null}
          </div>

          <NodeRetryInfo maxRetries={maxRetries} timeoutMs={timeoutMs} />
        </div>

        <NodeHandles
          nodeType={typeof data.type === "string" ? data.type : "unknown"}
          borderColor={borderColor}
          config={(data as any)?.config}
        />
      </div>
    </div>
  );
}
