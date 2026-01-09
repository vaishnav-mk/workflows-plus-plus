import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Node, Edge } from "reactflow";
import {
  useCompileWorkflowMutation,
  useDeployWorkflowMutation
} from "@/hooks/useWorkflowsQuery";
import { generateWorkflowId } from "@/utils/id-generator";
import { toast } from "@/stores/toastStore";
import {
  convertNodesToWorkflowNodes,
  convertEdgesToWorkflowEdges
} from "@/utils/workflow-converter";
import type { CompileWorkflowRequest } from "@/lib/api/types";
import { ROUTES } from "@/config/constants";

interface UseWorkflowActionsProps {
  nodes: Node[];
  edges: Edge[];
  workflowId: string | null;
  mcpEnabled: boolean;
  setBackendCode: (code: string) => void;
  setBackendBindings: (bindings: any[]) => void;
  setShowCodePreview: (show: boolean) => void;
  saveWorkflowToStorage: (workflow: any) => void;
}

export function useWorkflowActions({
  nodes,
  edges,
  workflowId,
  mcpEnabled,
  setBackendCode,
  setBackendBindings,
  setShowCodePreview,
  saveWorkflowToStorage
}: UseWorkflowActionsProps) {
  const router = useRouter();
  const compileWorkflowMutation = useCompileWorkflowMutation();
  const deployWorkflowMutation = useDeployWorkflowMutation();

  const handleCodePreviewClick = useCallback(async () => {
    try {
      const currentWorkflowId = workflowId || generateWorkflowId();
      const workflow: CompileWorkflowRequest = {
        name: "Workflow",
        nodes: convertNodesToWorkflowNodes(nodes),
        edges: convertEdgesToWorkflowEdges(edges),
        options: {
          workflowId: currentWorkflowId
        }
      };

      const result = await compileWorkflowMutation.mutateAsync(workflow);
      if (result) {
        setBackendCode(result.tsCode);
        setBackendBindings(result.bindings);
        toast.success("Code Generated", "Worker code generated successfully");
      } else {
        setBackendCode("");
        setBackendBindings([]);
        toast.warning(
          "Code Generation Issue",
          "No worker code found in response"
        );
      }
    } catch (e) {
      setBackendCode("");
      setBackendBindings([]);
      toast.error(
        "Code Generation Failed",
        e instanceof Error ? e.message : "Unknown error"
      );
    }
    setShowCodePreview(true);
  }, [
    nodes,
    edges,
    workflowId,
    setBackendCode,
    setBackendBindings,
    setShowCodePreview,
    compileWorkflowMutation
  ]);

  const handleDeployClick = useCallback(async () => {
    try {
      const currentWorkflowId = workflowId || generateWorkflowId();

      const workflow: CompileWorkflowRequest = {
        name: "Workflow",
        nodes: convertNodesToWorkflowNodes(nodes),
        edges: convertEdgesToWorkflowEdges(edges),
        options: {
          workflowId: currentWorkflowId
        }
      };

      const compileResult = await compileWorkflowMutation.mutateAsync(workflow);

      if (!compileResult) {
        toast.error("Deployment Failed", "Failed to compile workflow");
        return;
      }

      saveWorkflowToStorage({
        id: currentWorkflowId,
        nodes,
        edges,
        backendCode: compileResult.tsCode,
        backendBindings: compileResult.bindings
      });

      const deployResult = await deployWorkflowMutation.mutateAsync({
        workflowId: currentWorkflowId,
        options: {
          workflowName: currentWorkflowId,
          subdomain: "",
          bindings: compileResult.bindings,
          assets: {},
          nodes: convertNodesToWorkflowNodes(nodes),
          edges: convertEdgesToWorkflowEdges(edges),
          options: {
            workflowId: currentWorkflowId
          },
          workflowId: currentWorkflowId,
          mcpEnabled: mcpEnabled
        }
      });

      const deploymentId =
        (deployResult &&
          "deploymentId" in deployResult &&
          typeof deployResult.deploymentId === "string"
          ? deployResult.deploymentId
          : "") ||
        (currentWorkflowId.startsWith("workflow-")
          ? currentWorkflowId.replace("workflow-", "deployment-")
          : `deployment-${currentWorkflowId}`);

      router.push(`${ROUTES.DEPLOYMENT}?id=${deploymentId}`);
    } catch (e) {
      toast.error(
        "Deployment Failed",
        e instanceof Error ? e.message : "Unknown error"
      );
    }
  }, [
    nodes,
    edges,
    workflowId,
    mcpEnabled,
    compileWorkflowMutation,
    deployWorkflowMutation,
    router,
    saveWorkflowToStorage
  ]);

  return {
    handleCodePreviewClick,
    handleDeployClick,
    isCompiling: compileWorkflowMutation.isPending,
    isDeploying: deployWorkflowMutation.isPending
  };
}

