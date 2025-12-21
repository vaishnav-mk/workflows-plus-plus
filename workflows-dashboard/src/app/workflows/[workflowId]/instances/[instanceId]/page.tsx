"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  useInstanceQuery,
  useWorkerVersionQuery,
  useWorkerVersionsQuery
} from "@/hooks/useWorkflowsQuery";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { WorkflowTailBottomSheet } from "@/components/workflow/WorkflowTailBottomSheet";
import { Spinner } from "@/components";
import {
  PageHeader,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Alert,
  AlertTitle,
  DateDisplay
} from "@/components";
import { applyNodeChanges, applyEdgeChanges, type Node, type Edge, type Connection } from "reactflow";
import type { InstanceDetail } from "@/types/instance";
import { useInstanceWorkflow } from "@/hooks/useInstanceWorkflow";
import { findStepForNode, getStepStatus } from "@/utils/instance";
import { NodeDetailsPanel, StepHistoryTable } from "@/components/instance";
import { ROUTES } from "@/config/constants";

export default function InstanceDetailPage() {
  const params = useParams();
  const workflowName = typeof params.workflowId === "string" ? params.workflowId : "";
  const instanceId = typeof params.instanceId === "string" ? params.instanceId : "";

  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const { data: instance, isLoading: instanceLoading, error: queryError } =
    useInstanceQuery(workflowName, instanceId);
  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? String(queryError)
        : null;

  const isInstanceDetail = (data: unknown): data is InstanceDetail => {
    return typeof data === "object" && data !== null && "status" in data;
  };

  const typedInstance: InstanceDetail | null =
    instance && isInstanceDetail(instance) ? instance : null;

  const workerId = `${workflowName}-worker`;
  const { data: versionsResult, isLoading: versionsLoading } =
    useWorkerVersionsQuery(workerId, 1, 100);

  const latestVersion = useMemo(() => {
    if (!versionsResult?.data || versionsResult.data.length === 0) return null;
    const sorted = [...versionsResult.data].sort((a: any, b: any) => {
      if (a.number !== undefined && b.number !== undefined)
        return b.number - a.number;
      if (a.created_on && b.created_on) {
        return new Date(b.created_on).getTime() - new Date(a.created_on).getTime();
      }
      return 0;
    });
    return sorted[0];
  }, [versionsResult?.data]);

  const { data: version, isLoading: versionLoading, error: versionError } =
    useWorkerVersionQuery(workerId, latestVersion?.id || "", "modules");

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    workflowLoading,
    workflowError
  } = useInstanceWorkflow(version);

  const onNodesChange = useCallback(
    (changes: any[]) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        return Array.isArray(updated)
          ? updated.filter(
              (n): n is Node => n !== null && typeof n === "object" && "id" in n
            )
          : [];
      });
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: any[]) => {
      setEdges((eds) => {
        const updated = applyEdgeChanges(changes, eds);
        return Array.isArray(updated)
          ? updated.filter(
              (e): e is Edge =>
                e !== null &&
                typeof e === "object" &&
                "id" in e &&
                "source" in e &&
                "target" in e
            )
          : [];
      });
    },
    [setEdges]
  );

  const onConnect = useCallback((_connection: Connection) => {}, []);

  useEffect(() => {
    if (
      typedInstance?.status &&
      (typedInstance.status.toLowerCase() === "running" ||
        typedInstance.status.toLowerCase() === "queued")
    ) {
      setIsLogsOpen(true);
    }
  }, [typedInstance?.status]);

  useEffect(() => {
    if (!typedInstance || nodes.length === 0) return;

    setNodes((currentNodes) => {
      let failedNodeIndex = -1;
      for (let i = 0; i < currentNodes.length; i++) {
        const step = findStepForNode(currentNodes[i], typedInstance.steps);
        if (step && step.success === false) {
          failedNodeIndex = i;
          break;
        }
      }

      return currentNodes.map((node, nodeIndex) => {
        const step = findStepForNode(node, typedInstance.steps);

        let status: string;
        if (failedNodeIndex !== -1 && nodeIndex < failedNodeIndex && !step) {
          status = "completed";
        } else {
          status = getStepStatus(step, typedInstance);
        }

        const backgroundColor =
          status === "completed"
            ? "#10b981"
            : status === "failed"
              ? "#FECCC8"
              : status === "running"
                ? "#3b82f6"
                : "#fbbf24";

        const description = step
          ? (
              <>
                Start: {step.start ? <DateDisplay date={step.start} /> : "—"} | End: {step.end ? <DateDisplay date={step.end} /> : "—"}
              </>
            )
          : node.data?.description || "Workflow node";

        return {
          ...node,
          style: {
            ...(node.style || {}),
            backgroundColor,
            color:
              status === "completed" || status === "failed" || status === "running"
                ? "white"
                : "black",
            border: "2px solid #374151",
            borderRadius: "8px"
          },
          data: {
            ...node.data,
            description,
            status,
            stepInfo: step
          }
        };
      });
    });
  }, [typedInstance, nodes.length, setNodes]);

  if (instanceLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-gray-600">Loading workflow instance...</p>
        </div>
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <AlertTitle>Error</AlertTitle>
          {error || "Instance not found"}
        </Alert>
      </div>
    );
  }

  const isWorkflowLoading = versionLoading || workflowLoading || versionsLoading;
  const hasWorkflowError = versionError || workflowError;
  const selectedStep =
    selectedNode && typedInstance
      ? findStepForNode(selectedNode, typedInstance.steps)
      : null;

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-6 py-8">
        <PageHeader
          title={`Instance ${instanceId.substring(0, 8)}...`}
          description="Workflow execution details and step history"
          secondaryAction={{
            label: "← Back to Workflows",
            onClick: () => (window.location.href = ROUTES.WORKFLOWS)
          }}
        />

        <div className="grid grid-cols-12 gap-6 mt-6">
          <div className="col-span-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    Workflow Execution
                  </h2>
                  {isWorkflowLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Spinner size="sm" />
                      <span>Loading workflow...</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {hasWorkflowError && (
                  <Alert variant="error" className="mb-4">
                    <AlertTitle>Workflow Loading Error</AlertTitle>
                    {workflowError ||
                      (versionError instanceof Error
                        ? versionError.message
                        : String(versionError))}
                    <p className="text-sm mt-2 text-gray-600">
                      Instance data is shown below. The workflow visualization
                      may be incomplete.
                    </p>
                  </Alert>
                )}
                {nodes.length === 0 && !isWorkflowLoading && !hasWorkflowError && (
                  <Alert variant="info" className="mb-4">
                    <AlertTitle>Workflow Not Loaded</AlertTitle>
                    <p className="text-sm mt-2 text-gray-600">
                      Workflow visualization is not available. Instance data is
                      shown below.
                    </p>
                  </Alert>
                )}
                <div style={{ height: "600px", width: "100%", minHeight: "600px" }}>
                  <WorkflowCanvas
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={(_, node) => setSelectedNode(node)}
                    onEdgeClick={() => undefined}
                  />
                </div>
                <div className="mt-4 flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: "#FECCC8" }}
                    ></div>
                    <span>Failed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Running</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span>Pending</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-4">
            <NodeDetailsPanel selectedNode={selectedNode} step={selectedStep} />
          </div>
        </div>

        {typedInstance?.steps && typedInstance.steps.length > 0 && (
          <StepHistoryTable steps={typedInstance.steps} />
        )}

        <div className="fixed bottom-6 right-6 z-40">
          <Button
            variant="primary"
            onClick={() => setIsLogsOpen(true)}
            className="rounded-full shadow-lg relative"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Workflow Tail
            {typedInstance?.status &&
              (typedInstance.status.toLowerCase() === "running" ||
                typedInstance.status.toLowerCase() === "queued") && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              )}
          </Button>
        </div>

        <WorkflowTailBottomSheet
          workflowName={workflowName}
          instanceId={instanceId}
          isOpen={isLogsOpen}
          onClose={() => setIsLogsOpen(false)}
          onStatusUpdate={() => {}}
        />
      </div>
    </div>
  );
}
