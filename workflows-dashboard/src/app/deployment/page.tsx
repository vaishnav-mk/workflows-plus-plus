"use client";

import React, { useMemo, Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader, Card, Spinner } from "@/components";
import { useDeploymentSSE } from "@/hooks/useDeploymentSSE";
import type { DeploymentStateResponse } from "@/lib/api/types";
import { useDeploymentStatusQuery } from "@/hooks/useWorkflowsQuery";
import { isSuccessResponse } from "@/lib/api/utils";
import { DeploymentStatus, DeploymentStep } from "@/config/enums";
import { DEPLOYMENT } from "@/config/constants";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api/client";
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
  const router = useRouter();
  const deploymentId = searchParams.get("id");
  const [deployments, setDeployments] = useState<Array<{
    id: string;
    workflowId: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  }>>([]);
  const [loadingDeployments, setLoadingDeployments] = useState(true);

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const response = await apiClient.getDeployments();
        if (isSuccessResponse(response)) {
          setDeployments(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch deployments:", error);
      } finally {
        setLoadingDeployments(false);
      }
    };
    fetchDeployments();
  }, []);

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
        <div className="flex items-center justify-between mb-6">
          <PageHeader
            title="Deployment"
            description="Track the real-time status and steps of your workflow deployment."
          />
          {deploymentId && !loadingDeployments && deployments.length > 0 && (
            <div className="ml-4">
              <select
                value={deploymentId}
                onChange={(e) => router.push(`/deployment?id=${e.target.value}`)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {deployments.map((deployment) => (
                  <option key={deployment.id} value={deployment.id}>
                    {deployment.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-6">
          {!deploymentId && (
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Select a Deployment
                </h2>
                {loadingDeployments ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="md" className="text-blue-500" />
                  </div>
                ) : deployments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No deployments yet
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">
                      Deploy a workflow to see it appear here.
                    </p>
                    <a
                      href="/"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Go to Workflows
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deployments.map((deployment) => (
                      <button
                        key={deployment.id}
                        onClick={() => router.push(`/deployment?id=${deployment.id}`)}
                        className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{deployment.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              ID: {deployment.id}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              Updated: {new Date(deployment.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
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
