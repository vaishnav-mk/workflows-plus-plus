"use client";

import React, { useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  PageHeader,
  Card,
  Button,
  Alert,
  AlertTitle,
  Spinner,
  DetailsList,
  Badge,
  IconButton
} from "@/components";
import { useDeploymentSSE, DeploymentProgress } from "@/hooks/useDeploymentSSE";
import { useDeploymentStatusQuery } from "@/hooks/useWorkflowsQuery";
import {
  CheckCircle2,
  XCircle,
  Rocket,
  AlertCircle,
  Play,
  Cog,
  Package,
  Upload,
  RefreshCw,
  Zap,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactFlow, {
  Node,
  Edge,
  Background,
  BackgroundVariant
} from "reactflow";
import "reactflow/dist/style.css";

function formatTimestamp(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

// Step configuration with icons - maps step names to display info
const STEP_CONFIG: Record<string, { label: string; icon: any }> = {
  initializing: { label: "Initialize", icon: Play },
  creating_worker: { label: "Create Worker", icon: Cog },
  worker_created: { label: "Worker Created", icon: Check },
  transforming_bindings: { label: "Transform Bindings", icon: RefreshCw },
  bindings_transformed: { label: "Bindings Ready", icon: Check },
  creating_version: { label: "Create Version", icon: Package },
  version_created: { label: "Version Created", icon: Check },
  deploying: { label: "Deploy", icon: Upload },
  deployment_created: { label: "Deployment Ready", icon: Check },
  updating_workflow: { label: "Update Workflow", icon: RefreshCw },
  workflow_updated: { label: "Workflow Updated", icon: Check },
  creating_instance: { label: "Create Instance", icon: Rocket },
  completed: { label: "Completed", icon: Zap }
};

// Animated Step Flow Component
interface AnimatedStepFlowProps {
  currentStep: string;
  progress: number;
  isCompleted: boolean;
  isFailed: boolean;
  progressEvents: DeploymentProgress[];
  allSteps: string[];
}

function AnimatedStepFlow({
  currentStep,
  progress: _progress,
  isCompleted,
  isFailed,
  progressEvents,
  allSteps
}: AnimatedStepFlowProps) {
  // Build ordered step list from backend events, enriched with any extra steps from progress (e.g. "failed")
  const steps = useMemo(() => {
    const result: {
      step: string;
      label: string;
      icon: any;
      progress: number;
    }[] = [];
    const seen = new Set<string>();

    const ordered =
      allSteps && allSteps.length > 0
        ? allSteps
        : progressEvents.map((e) => e.step);

    ordered.forEach((stepKey) => {
      if (stepKey === "failed") return; // do not create a separate failed node
      if (seen.has(stepKey)) return;
      seen.add(stepKey);
      const event = progressEvents.find((e) => e.step === stepKey);
      const config = STEP_CONFIG[stepKey] || { label: stepKey, icon: Cog };
      result.push({
        step: stepKey,
        label: config.label,
        icon: config.icon,
        progress: event?.progress ?? 0
      });
    });

    // Append any additional steps we saw in progress that weren't in events (except the synthetic "failed" step)
    progressEvents.forEach((event) => {
      if (event.step === "failed") return;
      if (!seen.has(event.step)) {
        const config = STEP_CONFIG[event.step] || {
          label: event.step,
          icon: Cog
        };
        seen.add(event.step);
        result.push({
          step: event.step,
          label: config.label,
          icon: config.icon,
          progress: event.progress
        });
      }
    });

    return result;
  }, [allSteps, progressEvents]);

  const currentStepIndex = steps.findIndex((s) => s.step === currentStep);

  const nodes: Node[] = useMemo(() => {
    const stepWidth = 140;
    const stepHeight = 80;
    const horizontalGap = 60;
    const verticalGap = 140;
    const stepsPerRow = 5;

    const cols = Math.min(stepsPerRow, Math.max(steps.length, 1));
    const rows = Math.max(Math.ceil(steps.length / stepsPerRow), 1);
    const totalWidth = (cols - 1) * (stepWidth + horizontalGap);
    const totalHeight = (rows - 1) * (stepHeight + verticalGap);
    const offsetX = -totalWidth / 2;
    const offsetY = -totalHeight / 2;

    const lastEvent = progressEvents[progressEvents.length - 1] || null;
    const penultimateEvent =
      progressEvents.length > 1
        ? progressEvents[progressEvents.length - 2]
        : null;

    // If deployment failed and last event is the synthetic "failed" step,
    // treat the previous real step as the one that visually failed.
    const failedOnStepKey =
      isFailed && lastEvent?.step === "failed"
        ? penultimateEvent?.step
        : lastEvent?.step || currentStep;

    return steps.map((step, index) => {
      const row = Math.floor(index / stepsPerRow);
      const col = index % stepsPerRow;
      const isEvenRow = row % 2 === 0;
      const baseX = isEvenRow
        ? col * (stepWidth + horizontalGap)
        : (stepsPerRow - 1 - col) * (stepWidth + horizontalGap);
      const baseY = row * (stepHeight + verticalGap);
      const x = baseX + offsetX;
      const y = baseY + offsetY;

      const progressIndex = progressEvents.findIndex(
        (e) => e.step === step.step
      );
      const failureIndex =
        isFailed && lastEvent?.step === "failed"
          ? Math.max(progressEvents.length - 2, 0)
          : progressEvents.length - 1;

      const isActive = step.step === failedOnStepKey;
      const isCurrentFailed = isFailed && isActive;
      const isCompletedStep =
        progressIndex !== -1 &&
        progressIndex < failureIndex &&
        !isCurrentFailed;
      const Icon = step.icon;

      // Check if icon is a gear/spinner type
      const isSpinnerIcon = [Cog, RefreshCw].includes(Icon);

      return {
        id: step.step,
        position: { x, y },
        data: {
          label: (
            <div
              key={`${step.step}-${isActive ? "active" : isCompletedStep ? "completed" : "pending"}-${isFailed ? "failed" : ""}`}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all duration-500 h-[90px] ${
                isCurrentFailed
                  ? "bg-red-50 border-red-400 shadow-lg shadow-red-200"
                  : isCompletedStep
                    ? "bg-green-50 border-green-400 shadow-lg shadow-green-200"
                    : isActive
                      ? "bg-blue-50 border-blue-500"
                      : "bg-gray-50 border-gray-300"
              }`}
              style={{
                transform: isActive ? "scale(1.08)" : "scale(1)",
                minHeight: "90px",
                maxHeight: "90px"
              }}
            >
              {isActive && !isCurrentFailed ? (
                <div>
                  <Icon
                    className={`w-6 h-6 transition-colors duration-300 ${
                      isSpinnerIcon ? "animate-spin" : ""
                    } text-blue-600`}
                  />
                </div>
              ) : (
                <Icon
                  className={`w-6 h-6 transition-colors duration-300 ${
                    isCurrentFailed
                      ? "text-red-600"
                      : isCompletedStep
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                />
              )}
              <span
                className={`text-xs font-medium text-center transition-colors duration-300 ${
                  isCurrentFailed
                    ? "text-red-900"
                    : isCompletedStep
                      ? "text-green-900"
                      : isActive
                        ? "text-blue-900"
                        : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        },
        type: "default",
        draggable: false,
        selectable: false
      };
    });
  }, [steps, progressEvents, currentStep, isFailed]);

  const edges: Edge[] = useMemo(() => {
    const newEdges: Edge[] = [];
    for (let i = 0; i < steps.length - 1; i++) {
      const isCompleted = i < currentStepIndex;

      newEdges.push({
        id: `e${i}-${i + 1}`,
        source: steps[i].step,
        target: steps[i + 1].step,
        animated: i === currentStepIndex - 1,
        style: {
          stroke: isCompleted ? "#10b981" : "#cbd5e1",
          strokeWidth: isCompleted ? 3 : 2
        },
        type: "smoothstep"
      });
    }
    return newEdges;
  }, [currentStepIndex, steps]);

  return (
    <>
      <style jsx>{`
        @keyframes expand-from-center {
          0% {
            clip-path: circle(0% at 50% 50%);
          }
          100% {
            clip-path: circle(150% at 50% 50%);
          }
        }
        .bg-expand {
          animation: expand-from-center 1.2s ease-out forwards;
        }
      `}</style>
      <div className="w-full h-[700px] rounded-lg border shadow-inner relative overflow-hidden bg-white border-gray-200">
        {isCompleted && (
          <div className="absolute inset-0 bg-green-50 border-green-300 bg-expand" />
        )}
        {isFailed && (
          <div className="absolute inset-0 bg-red-50 border-red-300 bg-expand" />
        )}
        <div className="relative w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.4 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={true}
            panOnDrag={true}
            preventScrolling={true}
            minZoom={0.5}
            maxZoom={1}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={2}
              color={isFailed ? "#ef4444" : isCompleted ? "#10b981" : "#f97316"}
              className="opacity-40"
            />
          </ReactFlow>
        </div>
      </div>
    </>
  );
}

function DeploymentPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deploymentId = searchParams.get("id");

  const { data: statusResult } = useDeploymentStatusQuery(
    deploymentId || undefined
  );

  const {
    state,
    isConnected,
    error: sseError
  } = useDeploymentSSE({
    deploymentId: deploymentId || "",
    enabled: !!deploymentId
  });

  const deploymentState = state || statusResult?.data || null;
  const progressEvents = useMemo(() => deploymentState?.progress ?? [], [deploymentState?.progress]);
  const currentProgressIndex =
    progressEvents.length > 0 ? progressEvents.length - 1 : -1;
  const currentProgress =
    currentProgressIndex >= 0 ? progressEvents[currentProgressIndex] : null;
  const progressPercentage = currentProgress?.progress ?? 0;

  // Reverse progress events for display (newest first)
  const reversedProgressEvents = useMemo(
    () => [...progressEvents].reverse(),
    [progressEvents]
  );
  const allSteps = (statusResult as any)?.events ?? [];

  const rawError = sseError || deploymentState?.error;

  const errorInfo = (() => {
    if (!rawError) return null;

    let shortMessage = rawError;
    let cfCode: number | undefined;
    let cfMessage: string | undefined;

    try {
      // Many errors come back as "... 409 {json...}", split out the JSON part if present
      let jsonPart: string | null = null;
      const firstBrace = rawError.indexOf("{");
      if (firstBrace !== -1) {
        jsonPart = rawError.slice(firstBrace);
      } else {
        const match = rawError.match(/^\s*\d+\s+(.+)$/);
        jsonPart = match ? match[1] : null;
      }

      const parsed = jsonPart ? JSON.parse(jsonPart) : null;
      const firstError = parsed?.errors?.[0];
      cfMessage =
        typeof firstError?.message === "string"
          ? firstError.message
          : undefined;
      cfCode =
        typeof firstError?.code === "number" ? firstError.code : undefined;

      if (cfMessage) {
        shortMessage = cfMessage;
      }
    } catch {
      // Fallback to rawError
    }

    return {
      shortMessage,
      raw: rawError,
      cfCode,
      cfMessage
    };
  })();

  const statusText = (() => {
    if (deploymentState?.status) {
      return deploymentState.status.replace("_", " ").toUpperCase();
    }

    // If backend reports no deployment yet, show a clearer message
    if (
      statusResult &&
      statusResult.success === false &&
      statusResult.error === "No deployment found"
    ) {
      return "PENDING";
    }

    // Fallback based on connection state
    return isConnected ? "WAITING FOR UPDATES" : "CONNECTING...";
  })();

  const statusBadgeVariant = (() => {
    if (!deploymentState?.status) return "secondary" as const;
    switch (deploymentState.status) {
      case "success":
        return "success" as const;
      case "failed":
        return "error" as const;
      case "in_progress":
        return "warning" as const;
      default:
        return "default" as const;
    }
  })();

  if (!deploymentId) {
    return (
      <div className="w-full px-6 py-8">
        <PageHeader
          title="Deployment"
          description="View the status and progress of your workflow deployment."
        />
        <div className="max-w-3xl mt-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-yellow-50">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Deployment ID required
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Provide a deployment ID in the URL query parameter to view
                  deployment status.
                </p>
                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push("/builder")}
                  >
                    Go to Builder
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }



  const instanceHref =
    deploymentState?.workflowId && deploymentState?.result?.instanceId
      ? `/workflows/${deploymentState.workflowId}/instances/${deploymentState.result.instanceId}`
      : null;

  return (
    <div className="w-full px-6 py-8">
      <PageHeader
        title="Deployment"
        description="Track the real-time status and steps of your workflow deployment."
      />

      <div className="mt-6 space-y-6">
        {/* Show loading state when no deployment found yet */}
        {!deploymentState && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-6">
              <div className="flex flex-col items-center justify-center py-12">
                <Spinner size="lg" className="text-blue-500" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {isConnected ? "Waiting for deployment..." : "Connecting..."}
                </h3>
                <p className="mt-2 text-sm text-gray-600 text-center max-w-md">
                  {statusResult &&
                  statusResult.success === false &&
                  statusResult.error === "No deployment found"
                    ? "No deployment was found for this ID yet. Once a deployment is started, its progress will appear here."
                    : isConnected
                      ? "The deployment is being initialized. Progress updates will appear shortly."
                      : "Establishing connection to the deployment server..."}
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Animated Step Flow Visualization */}
        {deploymentState && progressEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-6 overflow-hidden">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Deployment Pipeline
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Real-time visualization of deployment steps
                </p>
              </div>
              <AnimatedStepFlow
                currentStep={currentProgress?.step || "initializing"}
                progress={progressPercentage}
                isCompleted={deploymentState?.status === "success"}
                isFailed={deploymentState?.status === "failed"}
                progressEvents={progressEvents}
                allSteps={allSteps}
              />
            </Card>
          </motion.div>
        )}

        {/* Error banner */}
        {errorInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert variant="error">
              <AlertTitle>Deployment failed</AlertTitle>
              <p className="mt-1 text-base font-semibold text-red-900">
                {errorInfo.shortMessage}
              </p>

              {/* Special handling for Cloudflare error code 10040 (worker name already exists) */}
              {errorInfo.cfCode === 10040 && (
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <p className="text-xs sm:text-sm text-red-700 max-w-xl">
                    This worker name already exists in your Cloudflare account.
                    Try again with a different workflow ID so the worker name
                    will be unique.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const workflowId = deploymentState?.workflowId;
                      if (workflowId) {
                        const params = new URLSearchParams();
                        params.set("id", workflowId);
                        params.set("regen", "1");
                        router.push(`/builder?${params.toString()}`);
                      } else {
                        router.push("/builder");
                      }
                    }}
                  >
                    Go back to builder with a new ID
                  </Button>
                </div>
              )}

              {errorInfo.raw && errorInfo.raw !== errorInfo.shortMessage && (
                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    View raw error
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                    {errorInfo.raw}
                  </pre>
                </details>
              )}
            </Alert>
          </motion.div>
        )}

        {/* Result + actions */}
        {deploymentState?.result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-green-900">
                Deployment Successful
              </h3>
              <div className="mt-3 space-y-2 text-xs text-gray-700">
                {deploymentState.result.workerUrl && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      Worker URL:{" "}
                    </span>
                    <a
                      href={deploymentState.result.workerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:underline break-all"
                    >
                      {deploymentState.result.workerUrl}
                    </a>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      aria-label="Copy worker URL"
                      onClick={() =>
                        navigator.clipboard?.writeText(
                          deploymentState.result.workerUrl as string
                        )
                      }
                    >
                      📋
                    </IconButton>
                  </div>
                )}
                {deploymentState.result.mcpUrl && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">MCP URL: </span>
                    <a
                      href={deploymentState.result.mcpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:underline break-all"
                    >
                      {deploymentState.result.mcpUrl}
                    </a>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      aria-label="Copy MCP URL"
                      onClick={() =>
                        navigator.clipboard?.writeText(
                          deploymentState.result.mcpUrl as string
                        )
                      }
                    >
                      📋
                    </IconButton>
                  </div>
                )}
                {deploymentState.result.instanceId && (
                  <div>
                    <span className="font-medium text-gray-900">
                      Instance ID:{" "}
                    </span>
                    <span className="font-mono">
                      {deploymentState.result.instanceId}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push("/builder")}
                >
                  Back to builder
                </Button>
                {deploymentState.result.workerUrl && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      window.open(deploymentState.result.workerUrl!, "_blank")
                    }
                  >
                    Open worker
                  </Button>
                )}
                {deploymentState.result.mcpUrl && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      window.open(deploymentState.result.mcpUrl!, "_blank")
                    }
                  >
                    Open MCP endpoint
                  </Button>
                )}
                {instanceHref && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => window.open(instanceHref, "_blank")}
                  >
                    View instance
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {deploymentState && progressEvents.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main timeline */}
            <div className="lg:col-span-2 space-y-6">
              {/* Steps timeline - Newest First with Animations */}
              {progressEvents.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-900">
                      Deployment Timeline
                    </h2>
                  </div>
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {reversedProgressEvents.map(
                        (
                          progress: DeploymentProgress,
                          reversedIndex: number
                        ) => {
                          // Map back to original index
                          const index =
                            progressEvents.length - 1 - reversedIndex;
                          const isCurrent = index === currentProgressIndex;
                          const isCompleted =
                            index < currentProgressIndex ||
                            (deploymentState?.status === "success" &&
                              index === currentProgressIndex);
                          const isFailed =
                            deploymentState?.status === "failed" && isCurrent;

                          const bgClasses = isFailed
                            ? "bg-red-50 border-2 border-red-300"
                            : isCompleted
                              ? "bg-green-50 border-2 border-green-300"
                              : "bg-blue-50 border-2 border-blue-300";

                          const icon = isFailed ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <Spinner size="sm" className="text-blue-500" />
                          );

                          // Find matching step for icon
                          const stepConfig = STEP_CONFIG[progress.step];
                          const StepIcon = stepConfig?.icon || Rocket;

                          return (
                            <motion.div
                              key={`${progress.step}-${progress.timestamp}`}
                              layout
                              initial={{ opacity: 0, y: -20, scale: 0.9 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1
                              }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                                mass: 1
                              }}
                              className={`flex items-start gap-4 p-4 rounded-lg ${bgClasses}`}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 200,
                                    delay: 0.1
                                  }}
                                  className="mt-0.5"
                                >
                                  {icon}
                                </motion.div>
                                {isCurrent && !isFailed && (
                                  <motion.div
                                    animate={{
                                      scale: [1, 1.2, 1]
                                    }}
                                    transition={{
                                      repeat: Infinity,
                                      duration: 1.5
                                    }}
                                  >
                                    <StepIcon className="w-4 h-4 text-blue-600" />
                                  </motion.div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-sm font-semibold text-gray-900"
                                  >
                                    {stepConfig?.label || progress.step}
                                  </motion.span>
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 }}
                                  >
                                    <Badge
                                      variant={
                                        isFailed
                                          ? "error"
                                          : isCompleted
                                            ? "success"
                                            : "warning"
                                      }
                                      className="text-xs"
                                    >
                                      {progress.progress}%
                                    </Badge>
                                  </motion.div>
                                </div>
                                <motion.p
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.25 }}
                                  className="text-xs text-gray-700 font-medium"
                                >
                                  {isFailed && errorInfo
                                    ? errorInfo.shortMessage
                                    : progress.message}
                                </motion.p>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.3 }}
                                  className="mt-1.5 text-[11px] text-gray-500 flex items-center gap-1"
                                >
                                  <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                  {formatTimestamp(progress.timestamp)}
                                </motion.div>
                                {isFailed && errorInfo?.raw && (
                                  <motion.details
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="mt-2"
                                  >
                                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                      View raw error
                                    </summary>
                                    <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                                      {errorInfo.raw}
                                    </pre>
                                  </motion.details>
                                )}
                                {!isFailed &&
                                  progress.data &&
                                  Object.keys(progress.data).length > 0 &&
                                  progress.data.stepIndex === undefined && (
                                    <motion.details
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.4 }}
                                      className="mt-2"
                                    >
                                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                        Details
                                      </summary>
                                      <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                                        {JSON.stringify(progress.data, null, 2)}
                                      </pre>
                                    </motion.details>
                                  )}
                              </div>
                            </motion.div>
                          );
                        }
                      )}
                    </AnimatePresence>
                  </div>
                </Card>
              )}
            </div>

            {/* Meta / details sidebar */}
            <div className="space-y-6">
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
                      value: (
                        <Badge variant={statusBadgeVariant}>{statusText}</Badge>
                      )
                    },
                    {
                      label: "Started at",
                      value: formatTimestamp(deploymentState?.startedAt)
                    },
                    {
                      label: "Completed at",
                      value: formatTimestamp(deploymentState?.completedAt)
                    },
                    {
                      label: "Connection",
                      value: (
                        <Badge variant={isConnected ? "success" : "error"}>
                          {isConnected ? "Connected" : "Disconnected"}
                        </Badge>
                      )
                    },
                    ...(instanceHref && deploymentState?.status === "completed"
                      ? [
                          {
                            label: "Instance",
                            value: "View instance",
                            href: instanceHref
                          } as const
                        ]
                      : [])
                  ]}
                />
              </Card>

              {/* Bindings summary */}
              {deploymentState?.result?.bindings &&
                deploymentState.result.bindings.length > 0 && (
                  <Card className="p-6 space-y-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        Bindings
                      </h2>
                      <p className="mt-1 text-xs text-gray-500">
                        Resources attached to this workflow worker.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {deploymentState.result.bindings.map((b: { type: string; name: string }) => (
                        <div
                          key={`${b.type}:${b.name}`}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-gray-900 break-all">
                                {b.name}
                              </span>
                              <IconButton
                                size="xs"
                                variant="ghost"
                                aria-label={`Copy binding ${b.name}`}
                                onClick={() =>
                                  navigator.clipboard?.writeText(b.name)
                                }
                              >
                                📋
                              </IconButton>
                            </div>
                            <span className="text-[11px] text-gray-500">
                              {b.type}
                            </span>
                          </div>
                          {b.type === "DURABLE_OBJECT" &&
                            deploymentState.result.mcpUrl && (
                              <Badge variant="outline" className="text-[11px]">
                                MCP enabled
                              </Badge>
                            )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DeploymentPage() {
  return (
    <Suspense fallback={
      <div className="w-full px-6 py-8">
        <PageHeader
          title="Deployment"
          description="View the status and progress of your workflow deployment."
        />
        <div className="max-w-3xl mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" className="text-blue-500" />
            </div>
          </Card>
        </div>
      </div>
    }>
      <DeploymentPageContent />
    </Suspense>
  );
}
