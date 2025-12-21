import { useEffect, useState } from "react";
import { generateWorkflowId } from "@/utils/id-generator";
import { parseUrlParams } from "@/utils/url-parser";

export function useWorkflowId(mcpEnabled: boolean) {
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = parseUrlParams(window.location.search);
    const { id } = params;
    const regenParam = new URLSearchParams(window.location.search).get("regen");
    const mcpParam = new URLSearchParams(window.location.search).get("mcp");

    if (mcpParam === "1") {
    } else if (mcpParam === null && mcpEnabled) {
      const newParams = new URLSearchParams(window.location.search);
      newParams.set("mcp", "1");
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${newParams.toString()}`
      );
    }

    if (id && regenParam === "1") {
      const newId = generateWorkflowId();
      setWorkflowId(newId);
      const newParams = new URLSearchParams(window.location.search);
      newParams.set("id", newId);
      newParams.delete("regen");
      if (mcpEnabled) {
        newParams.set("mcp", "1");
      }
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${newParams.toString()}`
      );
    } else if (id) {
      setWorkflowId(id);
    } else if (!workflowId) {
      const newId = generateWorkflowId();
      setWorkflowId(newId);
      const newParams = new URLSearchParams(window.location.search);
      newParams.set("id", newId);
      if (mcpEnabled) {
        newParams.set("mcp", "1");
      }
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${newParams.toString()}`
      );
    }
  }, [mcpEnabled, workflowId]);

  return { workflowId, setWorkflowId };
}

