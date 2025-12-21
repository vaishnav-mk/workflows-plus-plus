import { useState, useEffect } from "react";
import type { Node, Edge } from "reactflow";
import { apiClient } from "@/lib/api-client";
import { isSuccessResponse, getResponseError } from "@/lib/api/utils";
import type { WorkerVersion } from "@/lib/api/types";

export function useInstanceWorkflow(version: WorkerVersion | null | undefined) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkflow = async () => {
      if (!version?.modules || version.modules.length === 0 || nodes.length > 0)
        return;

      setWorkflowLoading(true);
      setWorkflowError(null);

      try {
        const mainModule =
          version.modules.find(
            (m: any) =>
              m.name.endsWith(".ts") ||
              m.name.endsWith(".js") ||
              m.name.endsWith(".mjs")
          ) || version.modules[0];

        if (!mainModule?.content_base64) {
          setWorkflowError("No code module found in version");
          setWorkflowLoading(false);
          return;
        }

        const workflowCode = atob(mainModule.content_base64);
        const result = await apiClient.reverseCodegen(workflowCode);

        if (!isSuccessResponse(result)) {
          throw new Error(
            getResponseError(result) ||
              result.message ||
              "Failed to parse workflow code"
          );
        }

        if (result.data.nodes && result.data.edges) {
          const nodesWithPositions = result.data.nodes.map(
            (node: any, index: number) => ({
              ...node,
              position: node.position || { x: 400, y: index * 200 },
              type: "workflow"
            })
          );

          const isValidNode = (n: unknown): n is Node => {
            return typeof n === "object" && n !== null && "id" in n;
          };

          const isValidEdge = (e: unknown): e is Edge => {
            return (
              typeof e === "object" &&
              e !== null &&
              "id" in e &&
              "source" in e &&
              "target" in e
            );
          };

          const convertedEdges: Edge[] = result.data.edges
            .filter(isValidEdge)
            .map((e: any) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle || null,
              targetHandle: e.targetHandle || null,
              type: (e.type || "step") as string,
              animated: true
            }));

          setNodes(nodesWithPositions.filter(isValidNode));
          setEdges(convertedEdges);
        }
      } catch (err) {
        setWorkflowError(
          err instanceof Error ? err.message : "Failed to load workflow"
        );
      } finally {
        setWorkflowLoading(false);
      }
    };

    loadWorkflow();
  }, [version, nodes.length]);

  return { nodes, edges, setNodes, setEdges, workflowLoading, workflowError };
}

