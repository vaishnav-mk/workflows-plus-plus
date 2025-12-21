import {
  Code,
  Play,
  CheckCircle,
  GitBranch,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Brain,
  Pause,
  Repeat,
  Globe,
  Database,
  Save,
  Clock,
  GitMerge
} from "lucide-react";

export const WORKFLOW_NODE_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Play,
  CheckCircle,
  Code,
  GitBranch,
  CheckSquare,
  Output: ArrowRight,
  Input: ArrowLeft,
  Brain,
  Pause,
  Repeat,
  Globe,
  Database,
  Save,
  Clock,
  GitMerge
};

