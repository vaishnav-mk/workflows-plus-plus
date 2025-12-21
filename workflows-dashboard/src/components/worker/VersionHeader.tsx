"use client";

import { Button, Badge } from "@/components";
import type { WorkerVersion } from "@/lib/api/types";

interface VersionHeaderProps {
  workerName: string;
  version: WorkerVersion | null;
  isEditing: boolean;
  onEditVersion: () => void;
  canEdit: boolean;
}

export function VersionHeader({
  workerName,
  version,
  isEditing,
  onEditVersion,
  canEdit
}: VersionHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {workerName || "Worker"}
          </h1>
          <div className="flex items-center gap-3">
            <Badge variant="info" className="text-sm px-3 py-1">
              Version {version?.number || "N/A"}
            </Badge>
            {version?.created_on && (
              <span className="text-base text-gray-600">
                Created{" "}
                {new Date(version.created_on).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="lg" comingSoon>
            View All Versions
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={onEditVersion}
            disabled={isEditing || !canEdit}
          >
            {isEditing ? "Parsing..." : "Edit Version"}
          </Button>
          <Button variant="primary" size="lg" comingSoon>
            Deploy to Production
          </Button>
        </div>
      </div>
    </div>
  );
}

