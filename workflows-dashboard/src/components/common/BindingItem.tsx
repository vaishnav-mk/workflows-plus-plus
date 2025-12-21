"use client";

import React from "react";
import { Badge, CopyButton, IconButton } from "@/components";
import { Copy } from "lucide-react";

export interface BindingItemData {
  name: string;
  type: string;
  text?: string;
  json?: boolean;
  mcpEnabled?: boolean;
}

export interface BindingItemProps {
  binding: BindingItemData;
  variant?: "detailed" | "compact";
  onCopy?: (text: string) => void;
}

export function BindingItem({ binding, variant = "detailed", onCopy }: BindingItemProps) {
  const copyText = binding.text
    ? binding.json
      ? JSON.stringify(JSON.parse(binding.text), null, 2)
      : binding.text
    : binding.name;

  if (variant === "compact") {
    return (
      <div className="flex items-center justify-between text-xs">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-gray-900 break-all">{binding.name}</span>
            <IconButton
              size="xs"
              variant="ghost"
              aria-label={`Copy binding ${binding.name}`}
              onClick={() => {
                if (onCopy) {
                  onCopy(copyText);
                } else {
                  navigator.clipboard?.writeText(copyText);
                }
              }}
            >
              <Copy className="w-3 h-3" />
            </IconButton>
          </div>
          <span className="text-[11px] text-gray-500">{binding.type}</span>
        </div>
        {binding.mcpEnabled && (
          <Badge variant="outline" className="text-[11px]">
            MCP enabled
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-white hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{binding.name}</h3>
        <div className="flex items-center gap-2">
          <Badge variant="info" className="text-sm">
            {binding.type}
          </Badge>
          {binding.json && (
            <Badge variant="info" className="text-sm">
              JSON
            </Badge>
          )}
        </div>
      </div>
      {binding.text && (
        <div className="relative">
          <div className="absolute top-3 right-3 z-10">
            <CopyButton
              text={copyText}
              size="md"
            />
          </div>
          <pre className="text-sm text-gray-800 bg-gray-50 rounded-lg p-4 overflow-x-auto border border-gray-200 font-mono leading-relaxed">
            {binding.json
              ? JSON.stringify(JSON.parse(binding.text), null, 2)
              : binding.text}
          </pre>
        </div>
      )}
    </div>
  );
}

