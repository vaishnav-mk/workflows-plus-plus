"use client";

import { RotateCw, Clock } from "lucide-react";
import { formatTimeout } from "@/utils/workflow-node";

interface NodeRetryInfoProps {
  maxRetries: number;
  timeoutMs?: number;
}

export function NodeRetryInfo({ maxRetries, timeoutMs }: NodeRetryInfoProps) {
  const timeoutFormatted = formatTimeout(timeoutMs);

  if (maxRetries === 0 && !timeoutFormatted) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "12px 8px",
        borderLeft: "1px solid #e5e7eb",
        minWidth: "48px"
      }}
    >
      {maxRetries > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px"
          }}
        >
          <RotateCw className="w-4 h-4 icon-thick" style={{ color: "#6b7280" }} />
          <span
            style={{
              fontSize: "10px",
              color: "#6b7280",
              fontWeight: 600
            }}
          >
            {maxRetries}
          </span>
        </div>
      )}
      {timeoutFormatted && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px"
          }}
        >
          <Clock className="w-4 h-4 icon-thick" style={{ color: "#6b7280" }} />
          <span
            style={{
              fontSize: "10px",
              color: "#6b7280",
              fontWeight: 600
            }}
          >
            {timeoutFormatted}
          </span>
        </div>
      )}
    </div>
  );
}

