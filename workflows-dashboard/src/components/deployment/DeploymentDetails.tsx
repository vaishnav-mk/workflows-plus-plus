"use client";

import { Card, Badge, DetailsList } from "@/components";
import type { DeploymentStateResponse } from "@/lib/api/types";
import { DeploymentStatus } from "@/config/enums";
import { STRINGS } from "@/config/constants";
import { formatTimestamp } from "@/utils/deployment";

interface DeploymentDetailsProps {
  deploymentState: DeploymentStateResponse | null;
  deploymentId: string;
  isConnected: boolean;
  statusText: string;
  statusBadgeVariant: "success" | "error" | "warning" | "default" | "secondary";
  instanceHref: string | null;
}

export function DeploymentDetails({
  deploymentState,
  deploymentId,
  isConnected,
  statusText,
  statusBadgeVariant,
  instanceHref
}: DeploymentDetailsProps) {
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">
          Deployment Details
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Metadata and links for this deployment.
        </p>
      </div>
      <DetailsList
        items={[
          {
            label: "Deployment ID",
            value: (
              <span className="font-mono">
                {deploymentState?.deploymentId || deploymentId}
              </span>
            )
          },
          {
            label: "Workflow ID",
            value: (
              <span className="font-mono">
                {deploymentState?.workflowId || "unknown"}
              </span>
            )
          },
          {
            label: "Status",
            value: <Badge variant={statusBadgeVariant}>{statusText}</Badge>
          },
          {
            label: "Started at",
            value: formatTimestamp(deploymentState?.startedAt || "")
          },
          {
            label: "Completed at",
            value: formatTimestamp(deploymentState?.completedAt || "")
          },
          {
            label: "Connection",
            value: (
              <Badge variant={isConnected ? "success" : "error"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            )
          },
          ...(instanceHref &&
          deploymentState?.status === DeploymentStatus.COMPLETED
            ? [
                {
                  label: "Instance",
                  value: STRINGS.VIEW_INSTANCE,
                  href: instanceHref
                }
              ]
            : [])
        ]}
      />
    </Card>
  );
}

