import React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "subtle" | "section";
  className?: string;
}

export function Separator({
  orientation = "horizontal",
  spacing = "md",
  variant = "default",
  className,
}: SeparatorProps) {
  const spacingClasses = {
    none: "",
    sm: orientation === "horizontal" ? "my-1.5" : "mx-1.5",
    md: orientation === "horizontal" ? "my-3" : "mx-3",
    lg: orientation === "horizontal" ? "my-4" : "mx-4",
    xl: orientation === "horizontal" ? "my-6" : "mx-6",
  };

  
  const variantClasses = {
    default: "bg-gray-200",
    subtle: "bg-gray-100",
    section: "bg-gray-300", 
  };

  if (orientation === "vertical") {
    return (
      <div
        className={cn(
          "w-px self-stretch",
          variantClasses[variant],
          spacingClasses[spacing],
          className
        )}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  return (
    <div
      className={cn(
        "h-px w-full",
        variantClasses[variant],
        spacingClasses[spacing],
        className
      )}
      role="separator"
      aria-orientation="horizontal"
    />
  );
}

