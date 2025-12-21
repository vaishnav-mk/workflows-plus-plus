import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "success" | "warning" | "error" | "info" | "outline";
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
    outline: "bg-transparent border border-gray-300 text-gray-700",
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


