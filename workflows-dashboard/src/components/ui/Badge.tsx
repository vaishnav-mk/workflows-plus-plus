import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "success" | "warning" | "error" | "info";
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  icon,
  className,
}: BadgeProps) {
  const variantClasses = {
    default: "bg-gray-100 text-gray-700",
    secondary: "bg-gray-200 text-gray-800",
    success: "bg-success text-gray-900",
    warning: "bg-warning text-gray-900",
    error: "bg-error text-gray-900",
    info: "bg-info text-gray-900",
  };

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", variantClasses[variant], className)}
    >
      {icon && (
        <span className="inline-flex items-center justify-center flex-shrink-0">
          {icon}
        </span>
      )}
      <span className="font-bold uppercase">{children}</span>
    </span>
  );
}

export function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      role="presentation"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm0 12a5.5 5.5 0 110-11 5.5 5.5 0 010 11z" />
      <path d="M6.977 9.527L5.002 7.466l-.722.693 2.685 2.805 4.748-4.8-.71-.703-4.026 4.067z" />
    </svg>
  );
}

