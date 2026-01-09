"use client";

import React, { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, Card, Spinner } from "@/components";
import { useDeploymentSSE } from "@/hooks/useDeploymentSSE";
import type { DeploymentStateResponse } from "@/lib/api/types";
import { useDeploymentStatusQuery } from "@/hooks/useWorkflowsQuery";
import { isSuccessResponse } from "@/lib/api/utils";
import { DeploymentStatus, DeploymentStep } from "@/config/enums";
import { DEPLOYMENT } from "@/config/constants";
import { motion } from "framer-motion";
import {
  AnimatedStepFlow,
  DeploymentTimeline,
  DeploymentDetails,
  DeploymentResult,
  ErrorBanner,
  LoadingState,
  NoDeploymentId,
  BindingsSummary
} from "@/components/deployment";
import { parseDeploymentError } from "@/utils/deployment";

function DeploymentPageContent() {
  const searchParams = useSearchParams();
  const deploymentId = searchParams.get("id");

  const { data: statusResult } = useDeploymentStatusQuery(deploymentId || "");

  const {
    state,
    isConnected,
    error: sseError
  } = useDeploymentSSE({
    deploymentId: deploymentId || "",
    enabled: !!deploymentId
  });

  const deploymentState: DeploymentStateResponse | null =
    state ||
    (statusResult && isSuccessResponse(statusResult)
      ? statusResult.data
      : null);

  const progressEvents = useMemo(() => {
    if (!deploymentState) return [];
    return deploymentState.progress.map((event) => {
      const stepValue = event.step || DeploymentStep.INITIALIZING;
      const messageValue = event.message || DEPLOYMENT.EMPTY_MESSAGE;
      const progressValue = event.progress || DEPLOYMENT.DEFAULT_PROGRESS;
      const timestampValue = event.timestamp || new Date().toISOString();
      const dataValue = event.data || {};

      return {
        step: stepValue,
        message: messageValue,
        progress: progressValue,
        timestamp: timestampValue,
        data: dataValue
      };
    });
  }, [deploymentState]);

  const currentProgressIndex =
    progressEvents.length > 0 ? progressEvents.length - 1 : -1;
  const currentProgress =
    currentProgressIndex >= 0 ? progressEvents[currentProgressIndex] : null;
  const progressPercentage = currentProgress?.progress ?? 0;

  const reversedProgressEvents = useMemo(
    () => [...progressEvents].reverse(),
    [progressEvents]
  );

  const rawError = sseError || deploymentState?.error || null;
  const errorInfo = parseDeploymentError(rawError);

  const statusText = (() => {
    if (deploymentState?.status) {
      return deploymentState.status.replace("_", " ").toUpperCase();
    }

    if (
      statusResult &&
      !isSuccessResponse(statusResult) &&
      statusResult.success === false &&
      statusResult.error === "No deployment found"
    ) {
      return "PENDING";
    }

    return isConnected ? "WAITING FOR UPDATES" : "CONNECTING...";
  })();

  const statusBadgeVariant = (() => {
    if (!deploymentState?.status) return "secondary" as const;
    switch (deploymentState.status) {
      case DeploymentStatus.SUCCESS:
        return "success" as const;
      case DeploymentStatus.FAILED:
        return "error" as const;
      case DeploymentStatus.IN_PROGRESS:
        return "warning" as const;
      default:
        return "default" as const;
    }
  })();

  if (!deploymentId) {
    return <NoDeploymentId />;
  }

  const instanceHref =
    deploymentState?.workflowId && deploymentState?.result?.instanceId
      ? `/workflows/${deploymentState.workflowId}/instances/${deploymentState.result.instanceId}`
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-6 py-8 max-w-7xl mx-auto">
        <PageHeader
          title="Deployment"
          description="Track the real-time status and steps of your workflow deployment."
        />

        <div className="mt-6 space-y-6">
          {!deploymentState && (
            <LoadingState
              isConnected={isConnected}
              hasNoDeployment={
                !!(
                  statusResult &&
                  statusResult.success === false &&
                  statusResult.error === "No deployment found"
                )
              }
            />
          )}

          {deploymentState && progressEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Deployment Pipeline
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Real-time visualization of deployment steps
                  </p>
                </div>
                <div className="p-6">
                  <AnimatedStepFlow
                    currentStep={
                      currentProgress?.step || DeploymentStep.INITIALIZING
                    }
                    progress={progressPercentage}
                    isCompleted={
                      deploymentState.status === DeploymentStatus.SUCCESS
                    }
                    isFailed={deploymentState.status === DeploymentStatus.FAILED}
                    progressEvents={progressEvents}
                    allSteps={deploymentState.events || []}
                  />
                </div>
              </Card>
            </motion.div>
          )}

          {errorInfo && (
            <ErrorBanner
              errorInfo={errorInfo}
              workflowId={deploymentState?.workflowId}
            />
          )}

          {deploymentState?.result && (
            <DeploymentResult
              result={deploymentState.result}
              workflowId={deploymentState.workflowId}
            />
          )}

          {deploymentState && progressEvents.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {progressEvents.length > 0 && (
                  <DeploymentTimeline
                    progressEvents={progressEvents}
                    reversedProgressEvents={reversedProgressEvents}
                    currentProgressIndex={currentProgressIndex}
                    deploymentState={deploymentState}
                    errorInfo={errorInfo}
                  />
                )}
              </div>

              <div className="space-y-6">
                <DeploymentDetails
                  deploymentState={deploymentState}
                  deploymentId={deploymentId}
                  isConnected={isConnected}
                  statusText={statusText}
                  statusBadgeVariant={statusBadgeVariant}
                  instanceHref={instanceHref}
                />

                {deploymentState?.result?.bindings &&
                  Array.isArray(deploymentState.result?.bindings) &&
                  deploymentState.result?.bindings.length > 0 && (
                    <BindingsSummary
                      bindings={deploymentState.result.bindings}
                      mcpUrl={deploymentState.result.mcpUrl}
                    />
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeploymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="w-full px-6 py-8 max-w-7xl mx-auto">
            <PageHeader
              title="Deployment"
              description="View the status and progress of your workflow deployment."
            />
            <div className="mt-6">
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-center py-12">
                    <Spinner size="lg" className="text-blue-500" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      }
    >
      <DeploymentPageContent />
    </Suspense>
  );
}
