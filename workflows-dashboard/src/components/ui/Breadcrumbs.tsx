import React from "react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui";

export interface BreadcrumbItem {
  label: string;
  icon?: React.ReactNode;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  maxLength?: number;
  showCopy?: boolean;
  className?: string;
}

export function Breadcrumbs({
  items,
  maxLength = 50,
  showCopy = true,
  className,
}: BreadcrumbsProps) {
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  
  const fullPath = items.map((item) => item.label).join("/");

  return (
    <div className={cn("flex items-center gap-1 text-sm", className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="text-gray-400 select-none">/</span>
          )}
          <div className="flex items-center gap-1.5">
            {item.icon && (
              <span className="text-blue-600 flex-shrink-0">{item.icon}</span>
            )}
            {item.href ? (
              <a
                href={item.href}
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                {index === items.length - 1
                  ? truncateText(item.label, maxLength)
                  : item.label}
              </a>
            ) : (
              <span className="text-gray-700">
                {index === items.length - 1
                  ? truncateText(item.label, maxLength)
                  : item.label}
              </span>
            )}
          </div>
        </React.Fragment>
      ))}
      {showCopy && fullPath && (
        <div className="ml-2 flex items-center">
          <CopyButton text={fullPath} size="sm" />
        </div>
      )}
    </div>
  );
}

