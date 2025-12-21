"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { ButtonProps } from "@/components/ui/Button";

export interface SectionHeaderAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: SectionHeaderAction[];
  className?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  icon,
  actions,
  className,
  leftContent,
  rightContent
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between border-b border-gray-200", className)}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
        {leftContent && <div className="flex-shrink-0">{leftContent}</div>}
      </div>
      {(actions && actions.length > 0) || rightContent ? (
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {actions?.map((action, idx) => {
            if (action.href) {
              return (
                <a key={idx} href={action.href} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant={action.variant || "secondary"}
                    size={action.size || "sm"}
                    disabled={action.disabled}
                  >
                    {action.icon && <span className="mr-1">{action.icon}</span>}
                    {action.label}
                  </Button>
                </a>
              );
            }
            return (
              <Button
                key={idx}
                variant={action.variant || "secondary"}
                size={action.size || "sm"}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </Button>
            );
          })}
          {rightContent}
        </div>
      ) : null}
    </div>
  );
}

