import React from "react";
import { StatCard } from "@/components/common";
import type { UsageStatsPanelProps, StatItem } from "@/types/components";

export type { StatItem };

export function UsageStatsPanel({
  title,
  dateRange,
  stats,
}: UsageStatsPanelProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {dateRange && (
          <span className="text-sm text-gray-700">{dateRange}</span>
        )}
      </div>
      <div className="flex flex-col gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title || stat.label || 'Stat'}
            value={stat.value}
            infoTooltip={stat.infoTooltip}
          />
        ))}
      </div>
    </div>
  );
}

