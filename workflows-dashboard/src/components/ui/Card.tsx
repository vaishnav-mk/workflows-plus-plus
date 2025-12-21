import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  tabIndex?: number;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function Card({ children, className, tabIndex, onFocus, onBlur }: CardProps) {
  return (
    <div 
      className={cn("ring ring-gray-950/10 shadow-xs bg-white rounded-lg p-4 relative focus-visible:ring focus-visible:ring-primary outline-none", className)}
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
  return <div className={cn("p-4 border-b border-gray-200", className)}>{children}</div>;
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

