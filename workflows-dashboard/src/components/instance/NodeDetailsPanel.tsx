"use client";

import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  CopyButton,
  JsonViewer,
  DetailsList
} from "@/components";
import type { Node } from "reactflow";
import type { InstanceStep } from "@/types/instance";

interface NodeDetailsPanelProps {
  selectedNode: Node | null;
  step: InstanceStep | null;
}

export function NodeDetailsPanel({
  selectedNode,
  step
}: NodeDetailsPanelProps) {
  if (!selectedNode) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Node Details</h3>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">
            Select a node to see details
          </div>
        </CardContent>
      </Card>
    );
  }

  const nodeLabel = String(
    selectedNode.data?.label || selectedNode.type || "Node"
  );
  const nodeType = String(selectedNode.data?.type || "unknown");
  const statusText = step?.success
    ? "Completed"
    : step?.success === false
      ? "Failed"
      : "Pending";
  const timeRange =
    step?.start && step?.end
      ? `${new Date(step.start).toLocaleTimeString()} - ${new Date(step.end).toLocaleTimeString()}`
      : step?.start
        ? `${new Date(step.start).toLocaleTimeString()} - —`
        : "—";

  const detailsItems = [
    {
      label: "Node Name",
      value: nodeLabel
    },
    {
      label: "Type",
      value: nodeType
    },
    {
      label: "Status",
      value: (
        <Badge
          variant={
            step?.success
              ? "success"
              : step?.success === false
                ? "error"
                : "default"
          }
        >
          {statusText}
        </Badge>
      )
    },
    {
      label: "Time Range",
      value: timeRange
    }
  ];

  if (step?.start && step?.end) {
    const duration = Math.round(
      new Date(step.end).getTime() - new Date(step.start).getTime()
    );
    detailsItems.push({
      label: "Duration",
      value: `${duration} ms`
    });
  }

  if (step?.attempts) {
    detailsItems.push({
      label: "Total Attempts",
      value: String(step.attempts.length || 1)
    });
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">Node Details</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm">
          <DetailsList items={detailsItems} />

          {step && (
            <>
              {step.error && (
                <div>
                  <div className="text-gray-700 font-medium mb-2">Error</div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-red-900 mb-1">
                      {typeof step.error === "object"
                        ? step.error.name || "Error"
                        : "Error"}
                    </div>
                    <div className="text-sm text-red-700">
                      {typeof step.error === "object"
                        ? step.error.message || "Unknown error"
                        : String(step.error)}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-gray-700 font-medium">Input</div>
                  {step.output && (
                    <CopyButton
                      text={
                        typeof step.output === "string"
                          ? step.output
                          : JSON.stringify(step.output, null, 2)
                      }
                    />
                  )}
                </div>
                {step.output ? (
                  <JsonViewer data={step.output} className="max-h-96" />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500">
                    No input data
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-gray-700 font-medium">Output</div>
                  {step.output && (
                    <CopyButton
                      text={
                        typeof step.output === "string"
                          ? step.output
                          : JSON.stringify(step.output, null, 2)
                      }
                    />
                  )}
                </div>
                {step.output ? (
                  <JsonViewer data={step.output} className="max-h-96" />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500">
                    No output data
                  </div>
                )}
              </div>

              {step.config && (
                <div>
                  <div className="text-gray-700 font-medium mb-2">
                    Configuration
                  </div>
                  <JsonViewer data={step.config} className="max-h-24" />
                </div>
              )}

              {step.attempts && step.attempts.length > 0 && (
                <div>
                  <div className="text-gray-700 font-medium mb-2">
                    Attempts ({step.attempts.length})
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {step.attempts.map((attempt: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">Attempt {idx + 1}</span>
                          <Badge
                            variant={attempt.success ? "success" : "error"}
                          >
                            {attempt.success ? "Success" : "Failed"}
                          </Badge>
                        </div>
                        {attempt.error && (
                          <div className="text-red-600 mt-1">
                            {typeof attempt.error === "object"
                              ? attempt.error.message ||
                                attempt.error.name ||
                                "Error"
                              : String(attempt.error)}
                          </div>
                        )}
                        <div className="text-gray-500 mt-1">
                          {attempt.start
                            ? new Date(attempt.start).toLocaleTimeString()
                            : "—"}{" "}
                          -{" "}
                          {attempt.end
                            ? new Date(attempt.end).toLocaleTimeString()
                            : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
