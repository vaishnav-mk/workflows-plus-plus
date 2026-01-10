import React from "react";
import { Card, InfoIcon } from "@/components/ui";
import type { StatCardProps } from "@/types/components";

export function StatCard({ title, value, infoTooltip }: StatCardProps) {
  return (
    <Card>
      <div className="p-4">
        <div className="text-xs text-neutral-600 mb-1 line-clamp-1 truncate flex items-center gap-1">
          <span>{title}</span>
          {infoTooltip && (
            <button
              className="text-neutral-600 hover:text-neutral-800 transition-colors"
              aria-label={infoTooltip}
              title={infoTooltip}
            >
              <InfoIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="w-full overflow-hidden h-8">
          <div className="transform scale-100 origin-left inline-block">
            <div className="text-lg md:text-2xl font-semibold whitespace-nowrap inline-block">
              {value}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

