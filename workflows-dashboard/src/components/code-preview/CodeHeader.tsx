"use client";

import { Copy, Download, Eye, EyeOff, Code, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CodeHeaderProps {
  showLineNumbers: boolean;
  copied: boolean;
  activeTab: "code" | "bindings";
  onToggleLineNumbers: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onClose: () => void;
}

export function CodeHeader({
  showLineNumbers,
  copied,
  activeTab,
  onToggleLineNumbers,
  onCopy,
  onDownload,
  onClose
}: CodeHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200">
      <div className="flex items-center space-x-2">
        <Code className="w-4 h-4 text-orange-500" />
        <h2 className="text-base font-semibold text-gray-900">
          Generated Code
        </h2>
      </div>
      <div className="flex items-center gap-2">
        {activeTab === "code" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleLineNumbers}
            >
              {showLineNumbers ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCopy}>
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDownload}>
              <Download className="w-4 h-4" />
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

