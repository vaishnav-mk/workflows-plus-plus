import React from "react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface AlertProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "info" | "warning" | "error" | "success";
  className?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function Alert({
  title,
  children,
  variant = "default",
  className,
  action,
}: AlertProps) {
  const variantClasses = {
    default: "bg-white border border-gray-200",
    info: "bg-info border border-gray-200",
    warning: "bg-warning border border-gray-200",
    error: "bg-error border border-gray-200",
    success: "bg-success border border-gray-200",
  };

  return (
    <div className={cn("rounded-lg p-4", variantClasses[variant], className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {title && (
            <div className="mb-1">
              {typeof title === "string" ? (
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              ) : (
                title
              )}
            </div>
          )}
          <div className="text-sm text-gray-700">
            {children}
          </div>
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action.href ? (
              <a
                href={action.href}
                className={cn(
                  "inline-flex items-center justify-center font-medium text-sm py-1 px-4 h-9 gap-1.5 rounded-lg bg-[#056DFF] text-white hover:opacity-90 transition-all duration-300 ease cursor-pointer select-none border-0 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#056DFF] focus:ring-offset-2"
                )}
              >
                <span>{action.label}</span>
              </a>
            ) : (
              <Button variant="primary" onClick={action.onClick}>
                {action.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export interface AlertTitleProps {
  children: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function AlertTitle({
  children,
  badge,
  className,
}: AlertTitleProps) {
  return (
    <h2 className={cn("text-base font-semibold text-gray-900 flex items-center gap-2", className)}>
      <span>{children}</span>
      {badge}
    </h2>
  );
}

