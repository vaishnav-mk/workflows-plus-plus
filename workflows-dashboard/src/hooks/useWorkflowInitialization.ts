import { useEffect, useRef, useState } from "react";
import { useWorkflowStore } from "@/stores/workflowStore";
import { apiClient } from "@/lib/api-client";
import { generateWorkflowId } from "@/utils/id-generator";
import { toast } from "@/stores/toastStore";
import { parseUrlParams } from "@/utils/url-parser";

export function useWorkflowInitialization() {
  const [mounted, setMounted] = useState(false);
  const {
    initializeWorkflow,
    loadWorkflowFromStorage,
    applyWorkflowToState,
    saveWorkflowToStorage
  } = useWorkflowStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || initializedRef.current) return;

    const init = async () => {
      initializedRef.current = true;

      if (typeof window === "undefined") return;

      const params = parseUrlParams(window.location.search);
      const { type, id, templateType } = params;

      if (type === "starter") {
        try {
          const starterId = templateType || id;
          if (!starterId) {
            await initializeWorkflow();
            return;
          }

          const result = await apiClient.getWorkflowStarter(starterId);

          if (result.success && result.data) {
            const starter = result.data as {
              workflow?: { nodes?: unknown[]; edges?: unknown[] };
            };

            if (!starter.workflow) {
              await initializeWorkflow();
              return;
            }

            const workflowId = id || generateWorkflowId();
            const newParams = new URLSearchParams(window.location.search);
            newParams.set("type", "starter");
            if (templateType) {
              newParams.set("template_type", templateType);
            } else if (starterId) {
              newParams.set("template_type", starterId);
            }
            newParams.set("id", workflowId);

            window.history.replaceState(
              {},
              "",
              `${window.location.pathname}?${newParams.toString()}`
            );

            await applyWorkflowToState({
              nodes: starter.workflow.nodes || [],
              edges: starter.workflow.edges || []
            });

            saveWorkflowToStorage({
              id: workflowId,
              nodes: starter.workflow.nodes || [],
              edges: starter.workflow.edges || []
            });
            return;
          }
        } catch (error) {
          await initializeWorkflow();
        }
      }

      if (type === "ai" && id) {
        const storedWorkflow = loadWorkflowFromStorage(id);
        if (storedWorkflow) {
          await applyWorkflowToState(storedWorkflow);
          return;
        }
      }

      if (id && !type) {
        const storedWorkflow = loadWorkflowFromStorage(id);
        if (storedWorkflow && storedWorkflow.nodes && storedWorkflow.nodes.length > 0) {
          await applyWorkflowToState(storedWorkflow);
          return;
        }

        try {
          const result = await apiClient.getWorkflow(id);
          if (result.success && result.data) {
            const workflow = result.data;
            if (workflow.nodes && workflow.nodes.length > 0) {
              await applyWorkflowToState({
                nodes: workflow.nodes || [],
                edges: workflow.edges || []
              });
              saveWorkflowToStorage({
                id: workflow.id || id,
                nodes: workflow.nodes || [],
                edges: workflow.edges || []
              });
              return;
            }
          }
        } catch (error) {
          if (storedWorkflow) {
            await applyWorkflowToState(storedWorkflow);
            return;
          }
        }
      }

      if (type === "version") {
        try {
          const storedWorkflowStr = sessionStorage.getItem(
            "workflow-from-version"
          );
          if (storedWorkflowStr) {
            const storedWorkflow = JSON.parse(storedWorkflowStr);
            await applyWorkflowToState(storedWorkflow);
            sessionStorage.removeItem("workflow-from-version");
            return;
          }
        } catch (error) {
          toast.error(
            "Failed to Load Workflow",
            "Could not parse workflow from version."
          );
        }
      }

      await initializeWorkflow();
    };

    init();
  }, [mounted, initializeWorkflow, applyWorkflowToState, loadWorkflowFromStorage, saveWorkflowToStorage]);

  return { mounted };
}

