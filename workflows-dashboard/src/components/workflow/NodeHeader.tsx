"use client";

import type React from "react";

interface NodeHeaderProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  nodeName: string;
  borderColor: string;
}

export function NodeHeader({ icon: Icon, nodeName, borderColor }: NodeHeaderProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: "-24px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        padding: "2px 6px",
        background: borderColor,
        borderRadius: "4px",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        zIndex: 10,
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white"
        }}
      >
        <Icon className="w-3 h-3 icon-thick" />
      </span>
      <span
        style={{
          fontWeight: 600,
          fontSize: "12px",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {nodeName.toUpperCase()}
      </span>
    </div>
  );
}

