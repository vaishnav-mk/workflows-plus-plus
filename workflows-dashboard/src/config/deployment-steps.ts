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
import type { StepConfig } from "@/types/deployment";

export const STEP_CONFIG: Record<string, StepConfig> = {
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

