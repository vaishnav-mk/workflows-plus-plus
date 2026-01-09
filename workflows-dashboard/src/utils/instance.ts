import type { Node } from "reactflow";
import type { InstanceDetail, InstanceStep } from "@/types/instance";

export function findStepForNode(
  node: Node,
  steps: InstanceDetail["steps"] = []
): InstanceStep | null {
  if (!node?.id) return null;

  const nodeId = node.id;
  const stepNameMatch = nodeId.match(/step_(\w+)_(\d+)/);

  if (stepNameMatch) {
    const [, type, num] = stepNameMatch;
    const candidates = [
      `step_${type}_${num}-1`,
      `step_${type}_${num}`,
      `${type}-${num}`
    ];

    for (const candidate of candidates) {
      const step = steps.find(
        (s: any) => s.name === candidate || s.name.includes(nodeId)
      );
      if (step) return step;
    }
  }

  const found = steps.find(
    (s: any) =>
      s.name.includes(nodeId) ||
      (node.data?.label && s.name.includes(node.data.label))
  );
  return found || null;
}

export function findNodeForStep(
  step: InstanceStep,
  nodes: Node[]
): Node | null {
  if (!step?.name) return null;

  const stepName = step.name;
  const found = nodes.find((node) => {
    if (!node?.id) return false;
    
    if (stepName.includes(node.id)) return true;
    if (node.id.includes(stepName)) return true;
    
    if (node.data?.label && stepName.includes(node.data.label as string)) return true;
    
    return false;
  });

  return found || null;
}

export function getStepStatus(
  step: InstanceStep | null,
  instanceData: InstanceDetail
): "completed" | "failed" | "running" | "pending" {
  if (!step) {
    const status = instanceData?.status?.toLowerCase();
    if (status === "complete" || status === "completed" || instanceData?.success === true)
      return "completed";
    if (status === "running" || status === "queued") return "running";
    if (status === "errored" || status === "failed") return "failed";
    return "pending";
  }

  if (step.success === true) return "completed";
  if (step.success === false) return "failed";

  const retryLimit = step.config?.retries?.limit || 0;
  const attempts = step.attempts || [];
  const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const allRetriesExhausted =
    attempts.length >= retryLimit && retryLimit > 0;

  if (allRetriesExhausted && lastAttempt && lastAttempt.success === false)
    return "failed";
  if (step.end === null || step.end === undefined) return "running";
  if (lastAttempt && lastAttempt.success === false) return "failed";

  return "pending";
}

