import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = "group flex w-max shrink-0 items-center font-medium select-none border-0 shadow-xs cursor-pointer outline-none rounded-lg";
  
  const variantClasses = {
    primary: "bg-[#056DFF] text-white hover:opacity-90 disabled:opacity-50 disabled:text-white/70 focus-visible:ring-1 focus-visible:ring-[#056DFF]",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-400 ring ring-gray-950/10 focus-visible:ring-1 focus-visible:ring-gray-500",
    ghost: "bg-inherit text-gray-900 hover:bg-gray-100 disabled:text-gray-400 shadow-none disabled:bg-inherit focus-visible:ring-1 focus-visible:ring-[#056DFF]",
    danger: "bg-red-500 text-white hover:opacity-90 disabled:opacity-50 disabled:text-white/70 focus-visible:ring-1 focus-visible:ring-red-500",
  };
  
  const sizeClasses = {
    sm: "h-8 gap-1.5 px-2.5 text-sm",
    md: "h-9 gap-1.5 px-3 text-base",
    lg: "h-10 gap-2 px-4 text-base",
  };
  
  return (
    <button
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && "disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

