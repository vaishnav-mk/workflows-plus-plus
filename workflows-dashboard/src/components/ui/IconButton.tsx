import React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "ghost" | "outline";
}

export function IconButton({
  children,
  size = "md",
  variant = "ghost",
  className,
  ...props
}: IconButtonProps) {
  const sizeClasses = {
    xs: "p-0.5",
    sm: "p-1",
    md: "p-2",
    lg: "p-3",
  };
  
  const variantClasses = {
    ghost: "text-gray-400 hover:text-gray-600",
    outline: "text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg",
  };
  
  return (
    <button
      className={cn("transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500", sizeClasses[size], variantClasses[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

