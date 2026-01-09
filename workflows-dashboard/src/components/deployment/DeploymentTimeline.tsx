"use client";

import { Card, Badge, Spinner, DateDisplay } from "@/components";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Rocket } from "lucide-react";
import type { DeploymentProgress } from "@/hooks/useDeploymentSSE";
import type { DeploymentStateResponse } from "@/lib/api/types";
import type { DeploymentErrorInfo } from "@/types/deployment";
import { DeploymentStatus } from "@/config/enums";
import { STEP_CONFIG } from "@/config/deployment-steps";

interface DeploymentTimelineProps {
  progressEvents: DeploymentProgress[];
  reversedProgressEvents: DeploymentProgress[];
  currentProgressIndex: number;
  deploymentState: DeploymentStateResponse | null;
  errorInfo: DeploymentErrorInfo | null;
}

export function DeploymentTimeline({
  progressEvents,
  reversedProgressEvents,
  currentProgressIndex,
  deploymentState,
  errorInfo
}: DeploymentTimelineProps) {
  return (
    <Card>
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          Deployment Timeline
        </h2>
      </div>
      <div className="p-6 space-y-1">
        <AnimatePresence mode="popLayout">
          {reversedProgressEvents.map(
            (progress: DeploymentProgress, reversedIndex: number) => {
              const index = progressEvents.length - 1 - reversedIndex;
              const isCurrent = index === currentProgressIndex;
              const isCompleted =
                index < currentProgressIndex ||
                deploymentState?.status === DeploymentStatus.SUCCESS;
              const isFailed =
                deploymentState?.status === DeploymentStatus.FAILED &&
                isCurrent;

              const borderColor = isFailed
                ? "border-red-400"
                : isCompleted
                  ? "border-green-400"
                  : isCurrent
                    ? "border-blue-500"
                    : "border-gray-200";

              const icon = isFailed ? (
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              ) : (
                <Spinner size="sm" className="text-blue-500 shrink-0" />
              );

              const stepConfig = STEP_CONFIG[progress.step];

              return (
                <motion.div
                  key={`${progress.step}-${progress.timestamp}-${reversedIndex}`}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-start gap-3 py-2.5 px-3 border-l-2 ${borderColor} hover:bg-gray-50/50 transition-all rounded-r group`}
                >
                  <div className="mt-0.5">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {stepConfig?.label || progress.step}
                      </span>
                      <Badge
                        variant={
                          isFailed
                            ? "error"
                            : isCompleted
                              ? "success"
                              : "warning"
                        }
                        className="text-[10px] px-1.5 py-0.5 shrink-0 font-semibold"
                      >
                        {progress.progress}%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {isFailed && errorInfo
                        ? errorInfo.shortMessage
                        : progress.message}
                    </p>
                    <div className="mt-1 text-[10px] text-gray-400 font-medium">
                      <DateDisplay date={progress.timestamp} />
                    </div>
                    {isFailed && errorInfo?.raw && (
                      <details className="mt-2 group/details">
                        <summary className="text-[10px] text-red-600 cursor-pointer hover:text-red-700 font-medium">
                          View raw error
                        </summary>
                        <pre className="mt-1.5 text-[10px] bg-red-50 border border-red-200 p-2.5 rounded overflow-auto max-h-32 font-mono">
                          {errorInfo.raw}
                        </pre>
                      </details>
                    )}
                    {!isFailed &&
                      progress.data &&
                      Object.keys(progress.data).length > 0 &&
                      progress.data.stepIndex === undefined && (
                        <details className="mt-2 group/details">
                          <summary className="text-[10px] text-blue-600 cursor-pointer hover:text-blue-700 font-medium">
                            Details
                          </summary>
                          <pre className="mt-1.5 text-[10px] bg-gray-50 border border-gray-200 p-2.5 rounded overflow-auto max-h-32 font-mono">
                            {JSON.stringify(progress.data, null, 2)}
                          </pre>
                        </details>
                      )}
                  </div>
                </motion.div>
              );
            }
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
