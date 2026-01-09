"use client";

import { Card, Badge, DetailsList, DateDisplay } from "@/components";
import type { DeploymentStateResponse } from "@/lib/api/types";
import { DeploymentStatus } from "@/config/enums";
import { STRINGS } from "@/config/constants";

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
    <Card>
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">
          Deployment Details
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Metadata and links for this deployment.
        </p>
      </div>
      <div className="p-6">
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
            value: deploymentState?.startedAt ? <DateDisplay date={deploymentState.startedAt} /> : "-"
          },
          {
            label: "Completed at",
            value: deploymentState?.completedAt ? <DateDisplay date={deploymentState.completedAt} /> : "-"
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
      </div>
    </Card>
  );
}

