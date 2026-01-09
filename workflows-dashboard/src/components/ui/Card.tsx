import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  tabIndex?: number;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function Card({
  children,
  className,
  tabIndex,
  onFocus,
  onBlur
}: CardProps) {
  return (
    <div
      className={cn(
        "border border-gray-200 bg-white rounded-2xl shadow-sm overflow-hidden relative focus-visible:ring-2 focus-visible:ring-blue-500 outline-none",
        className
      )}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "px-6 py-4 bg-gray-50 border-b border-gray-200 rounded-t-2xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("p-6 rounded-b-2xl", className)}>{children}</div>;
}
