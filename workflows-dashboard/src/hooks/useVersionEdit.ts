import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { isSuccessResponse, getResponseError } from "@/lib/api/utils";
import { toast } from "@/stores/toastStore";
import { ROUTES } from "@/config/constants";
import type { WorkerVersion } from "@/lib/api/types";

export function useVersionEdit() {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const handleEditVersion = async (version: WorkerVersion | null) => {
    if (!version?.modules || version.modules.length === 0) {
      toast.error(
        "No source code available",
        "This version does not have any modules to edit."
      );
      return;
    }

    setIsEditing(true);
    try {
      const mainModule =
        version.modules.find(
          (m: any) =>
            m.name.endsWith(".ts") ||
            m.name.endsWith(".js") ||
            m.name.endsWith(".mjs")
        ) || version.modules[0];

      if (!mainModule) {
        toast.error(
          "No code module found",
          "Could not find a code module in this version."
        );
        setIsEditing(false);
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

      const workflowData = {
        nodes: result.data.nodes,
        edges: result.data.edges
      };

      sessionStorage.setItem(
        "workflow-from-version",
        JSON.stringify(workflowData)
      );

      router.push(`${ROUTES.BUILDER}?type=version`);

      toast.success(
        "Loading workflow",
        "Parsed workflow code and loading in builder..."
      );
    } catch (error) {
      toast.error(
        "Failed to Edit Version",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      setIsEditing(false);
    }
  };

  return { isEditing, handleEditVersion };
}

