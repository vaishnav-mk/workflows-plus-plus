"use client";

import { Card } from "@/components";
import { BindingItem } from "@/components/common/BindingItem";
import type { Binding } from "@/lib/api/types";

interface BindingsSummaryProps {
  bindings: Binding[];
  mcpUrl?: string;
}

export function BindingsSummary({ bindings, mcpUrl }: BindingsSummaryProps) {
  if (!bindings || bindings.length === 0) return null;

  return (
    <Card className="p-6 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Bindings</h2>
        <p className="mt-1 text-xs text-gray-500">
          Resources attached to this workflow worker.
        </p>
      </div>
      <div className="space-y-2">
        {bindings.map((b) => (
          <BindingItem
            key={`${b.type}:${b.name}`}
            binding={{
              name: b.name,
              type: b.type,
              mcpEnabled: b.type === "DURABLE_OBJECT" && !!mcpUrl
            }}
            variant="compact"
          />
        ))}
      </div>
    </Card>
  );
}

