import React from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui";
import Link from "next/link";

export interface DetailItem {
  label: string | React.ReactNode;
  value: string | React.ReactNode;
  secondaryValue?: string | React.ReactNode;
  href?: string;
  actionIcon?: React.ReactNode;
  onActionClick?: () => void;
}

export interface DetailsListProps {
  title?: string;
  items: DetailItem[];
  className?: string;
}

export function DetailsList({ title, items, className }: DetailsListProps) {
  return (
    <div className={cn("bg-white rounded-lg border border-gray-200", className)}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-shrink-0 min-w-[140px]">
                  {typeof item.label === 'string' ? (
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  ) : (
                    item.label
                  )}
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
                  {item.secondaryValue ? (
                    <div className="flex flex-col gap-1 items-end">
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate"
                        >
                          {item.value}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-900 truncate">
                          {item.value}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 truncate">
                        {item.secondaryValue}
                      </span>
                    </div>
                  ) : (
                    <>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="text-sm text-gray-900 hover:text-blue-600 truncate"
                        >
                          {item.value}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-900 truncate">
                          {item.value}
                        </span>
                      )}
                    </>
                  )}
                  {item.actionIcon && (
                    <button
                      onClick={item.onActionClick}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Action"
                    >
                      {item.actionIcon}
                    </button>
                  )}
                </div>
              </div>
            </div>
            {index < items.length - 1 && (
              <div className="px-4">
                <Separator spacing="none" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

