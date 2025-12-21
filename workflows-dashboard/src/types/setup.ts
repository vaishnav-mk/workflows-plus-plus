import type { LucideIcon } from "lucide-react";

export type StepStatus = "pending" | "loading" | "success" | "error";

export interface SetupStep {
  id: string;
  label: string;
  status: StepStatus;
  message?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface CloudflareProduct {
  icon: LucideIcon;
  name: string;
  description: string;
  comingSoon: boolean;
}

export interface RequiredPermission {
  permission: string;
  reason: string;
}

export interface SetupErrors {
  apiToken?: string;
  accountId?: string;
}

