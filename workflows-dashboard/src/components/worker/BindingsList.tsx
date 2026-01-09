"use client";

import { Card, CardHeader, CardContent } from "@/components";
import { BindingItem } from "@/components/common/BindingItem";
import type { VersionBinding } from "@/types/worker";

interface BindingsListProps {
  bindings: VersionBinding[];
}

export function BindingsList({ bindings }: BindingsListProps) {
  if (!bindings || bindings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold text-gray-900">
          Environment Variables & Bindings
        </h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bindings.map((binding, index) => (
            <BindingItem
              key={index}
              binding={{
                name: binding.name,
                type: binding.type,
                text: binding.text,
                json: binding.json
              }}
              variant="detailed"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

