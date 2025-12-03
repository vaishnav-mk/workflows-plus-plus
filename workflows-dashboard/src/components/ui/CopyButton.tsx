"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { CopyIcon } from "@/components/ui";

export interface CopyButtonProps {
  text: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function CopyButton({ text, className, size = "md" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer",
        className
      )}
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <svg
          className={sizeClasses[size]}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <CopyIcon className={sizeClasses[size]} />
      )}
    </button>
  );
}

