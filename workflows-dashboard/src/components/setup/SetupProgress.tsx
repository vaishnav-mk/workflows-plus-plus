"use client";

import { Card, CardHeader, CardContent, Badge, CrossHatchBackground } from "@/components";
import {
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import type { SetupStep, StepStatus } from "@/types/setup";

interface SetupProgressProps {
  steps: SetupStep[];
}

function renderStepIcon(
  status: StepStatus,
  Icon: React.ComponentType<{ className?: string }>
) {
  switch (status) {
    case "loading":
      return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    case "success":
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case "error":
      return <XCircle className="w-5 h-5 text-red-600" />;
    default:
      return <Icon className="w-5 h-5 text-gray-400" />;
  }
}

export function SetupProgress({ steps }: SetupProgressProps) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm relative overflow-hidden">
      <CrossHatchBackground pattern="large" opacity={0.02} />
      <CardHeader className="relative z-10">
        <h2 className="text-xl font-semibold text-gray-900">Setup Progress</h2>
        <p className="mt-1 text-sm text-gray-600">
          Real-time validation and configuration
        </p>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3.5 rounded-lg transition-all relative overflow-hidden ${
                  step.status === "loading"
                    ? "bg-blue-50 border border-blue-200"
                    : step.status === "success"
                      ? "bg-green-50 border border-green-200"
                      : step.status === "error"
                        ? "bg-red-50 border border-red-200"
                        : "bg-gray-50 border border-gray-200"
                }`}
              >
                <CrossHatchBackground pattern="small" opacity={0.02} />
                <div className="flex-shrink-0 mt-0.5 relative z-10">
                  {renderStepIcon(step.status, Icon)}
                </div>
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={`text-sm font-semibold ${
                        step.status === "error"
                          ? "text-red-700"
                          : step.status === "success"
                            ? "text-green-700"
                            : step.status === "loading"
                              ? "text-blue-700"
                              : "text-gray-600"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.status === "success" && (
                      <Badge variant="success" className="text-xs">
                        Done
                      </Badge>
                    )}
                    {step.status === "error" && (
                      <Badge variant="error" className="text-xs">
                        Error
                      </Badge>
                    )}
                    {step.status === "loading" && (
                      <Badge variant="info" className="text-xs">
                        Processing
                      </Badge>
                    )}
                  </div>
                  {step.message && (
                    <p
                      className={`mt-1.5 text-xs ${
                        step.status === "error"
                          ? "text-red-600"
                          : step.status === "success"
                            ? "text-green-600"
                            : step.status === "loading"
                              ? "text-blue-600"
                              : "text-gray-500"
                      }`}
                    >
                      {step.message}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

