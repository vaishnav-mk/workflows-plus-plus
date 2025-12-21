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
    <Card className="p-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Deployment Timeline
        </h2>
      </div>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {reversedProgressEvents.map(
            (progress: DeploymentProgress, reversedIndex: number) => {
              const index = progressEvents.length - 1 - reversedIndex;
              const isCurrent = index === currentProgressIndex;
              const isCompleted =
                index < currentProgressIndex ||
                (deploymentState?.status === DeploymentStatus.SUCCESS &&
                  index === currentProgressIndex);
              const isFailed =
                deploymentState?.status === DeploymentStatus.FAILED && isCurrent;

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
                      <DateDisplay date={progress.timestamp} />
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
  );
}

