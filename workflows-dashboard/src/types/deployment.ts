import type { DeploymentProgress } from "@/hooks/useDeploymentSSE";
import type { LucideIcon } from "lucide-react";

export interface AnimatedStepFlowProps {
  currentStep: string;
  progress: number;
  isCompleted: boolean;
  isFailed: boolean;
  progressEvents: DeploymentProgress[];
  allSteps: string[];
}

export interface StepConfig {
  label: string;
  icon: LucideIcon;
}

export interface DeploymentErrorInfo {
  shortMessage: string;
  raw: string;
  cfCode: number;
  cfMessage: string;
}

export interface DeploymentStepData {
  step: string;
  label: string;
  icon: LucideIcon;
  progress: number;
}

