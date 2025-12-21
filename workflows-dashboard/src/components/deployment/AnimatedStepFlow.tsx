"use client";

import { useMemo } from "react";
import ReactFlow, { Node, Edge, Background, BackgroundVariant } from "reactflow";
import "reactflow/dist/style.css";
import type { AnimatedStepFlowProps, DeploymentStepData } from "@/types/deployment";
import { STEP_CONFIG } from "@/config/deployment-steps";
import { DEPLOYMENT } from "@/config/constants";
import { Cog, RefreshCw } from "lucide-react";

export function AnimatedStepFlow({
  currentStep,
  isCompleted,
  isFailed,
  progressEvents,
  allSteps
}: AnimatedStepFlowProps) {
  const steps = useMemo<DeploymentStepData[]>(() => {
    const result: DeploymentStepData[] = [];
    const seen = new Set<string>();

    const ordered =
      allSteps && allSteps.length > 0
        ? allSteps
        : progressEvents.map((e) => e.step);

    ordered.forEach((stepKey) => {
      if (stepKey === "failed") return;
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
    const {
      STEP_WIDTH,
      STEP_HEIGHT,
      HORIZONTAL_GAP,
      VERTICAL_GAP,
      STEPS_PER_ROW
    } = DEPLOYMENT;

    const cols = Math.min(STEPS_PER_ROW, Math.max(steps.length, 1));
    const rows = Math.max(Math.ceil(steps.length / STEPS_PER_ROW), 1);
    const totalWidth = (cols - 1) * (STEP_WIDTH + HORIZONTAL_GAP);
    const totalHeight = (rows - 1) * (STEP_HEIGHT + VERTICAL_GAP);
    const offsetX = -totalWidth / 2;
    const offsetY = -totalHeight / 2;

    const lastEvent = progressEvents[progressEvents.length - 1] || null;
    const penultimateEvent =
      progressEvents.length > 1
        ? progressEvents[progressEvents.length - 2]
        : null;

    const failedOnStepKey =
      isFailed && lastEvent?.step === "failed"
        ? penultimateEvent?.step
        : lastEvent?.step || currentStep;

    return steps.map((step, index) => {
      const row = Math.floor(index / STEPS_PER_ROW);
      const col = index % STEPS_PER_ROW;
      const isEvenRow = row % 2 === 0;
      const baseX = isEvenRow
        ? col * (STEP_WIDTH + HORIZONTAL_GAP)
        : (STEPS_PER_ROW - 1 - col) * (STEP_WIDTH + HORIZONTAL_GAP);
      const baseY = row * (STEP_HEIGHT + VERTICAL_GAP);
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

