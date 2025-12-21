'use client';

import React from 'react';
import { cn } from "@/lib/utils";

export interface LoaderProps {
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "skeleton" | "overlay" | "inline";
  text?: string;
  className?: string;
  fullscreen?: boolean;
}

function Spinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={cn(sizeClasses[size], className)}
      role="status"
      aria-label="Loading"
    >
      <svg
        className="animate-spin text-[#056DFF]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="4"
          strokeDasharray="32"
          strokeDashoffset="24"
          d="M12 2a10 10 0 0 1 10 10"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function Loader({
  size = "md",
  variant = "spinner",
  text,
  className,
  fullscreen = false,
}: LoaderProps) {
  if (variant === "spinner") {
    return <Spinner size={size} className={className} />;
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Spinner size={size} />
        {text && <span className="text-sm text-gray-600">{text}</span>}
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          fullscreen ? "min-h-screen bg-white" : "h-64",
          className
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <Spinner size={size} />
          {text && <p className="text-sm text-gray-600">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("animate-pulse bg-gray-200 rounded", className)}>
      {text && <span className="sr-only">{text}</span>}
    </div>
  );
}

export function WorkflowLoader({ text = "Loading..." }: { text?: string }) {
  return <Loader variant="overlay" size="lg" text={text} fullscreen />;
}

export function InstanceLoader({ text = "Loading..." }: { text?: string }) {
  return <Loader variant="overlay" size="md" text={text} />;
}

export function LogsLoader({ text = "Connecting..." }: { text?: string }) {
  return <Loader variant="inline" size="sm" text={text} />;
}

export function ButtonLoader({ text }: { text?: string }) {
  return <Loader variant="inline" size="sm" text={text} />;
}

export function InlineLoader({ text }: { text?: string }) {
  return <Loader variant="inline" size="sm" text={text} />;
}

export function SpinnerComponent({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  return <Spinner size={size} className={className} />;
}
