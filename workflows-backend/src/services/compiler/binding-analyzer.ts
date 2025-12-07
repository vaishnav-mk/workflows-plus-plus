import { BindingType } from "../../core/enums";
import {
  CodeGenResult,
  BindingUsage,
  BindingConfiguration
} from "../../core/types";
import {
  generateBindingName,
  generateClassName,
  generateWorkflowId
} from "../../core/utils/id-generator";

export const aggregateBindings = (
  codegenResults: Array<{
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    result: CodeGenResult;
  }>,
  workflowId?: string
): Array<{
  name: string;
  type: BindingType;
  usage: Array<{
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
  }>;
}> => {
  const bindingMap = new Map<string, BindingUsage[]>();

  const hasMCPNodes = codegenResults.some(
    r => r.nodeType === "mcp-tool-input" || r.nodeType === "mcp-tool-output"
  );

  codegenResults.forEach(({ nodeId, nodeLabel, nodeType, result }) => {
    (result.requiredBindings || []).forEach(binding => {
      const key = `${binding.name}:${binding.type}`;
      if (!bindingMap.has(key)) {
        bindingMap.set(key, []);
      }
      bindingMap.get(key)!.push({
        name: binding.name,
        type: binding.type,
        nodeId,
        nodeLabel,
        nodeType
      });
    });
  });

  const bindings = Array.from(bindingMap.values()).map(usages => {
    const bindingType = usages[0].type;
    const originalName = usages[0].name;
    const baseName = originalName.toUpperCase().replace(/[^A-Z0-9]/g, "_");

    let finalName: string;
    if (bindingType === BindingType.AI) {
      finalName = "AI";
    } else if (bindingType === BindingType.D1) {
      finalName = originalName.replace(/[^a-zA-Z0-9_]/g, "_");
    } else if (bindingType === BindingType.KV) {
      finalName = originalName.replace(/[^a-zA-Z0-9_]/g, "_");
    } else if (bindingType === BindingType.R2) {
      finalName = originalName.replace(/[^a-zA-Z0-9_]/g, "_");
    } else {
      if (workflowId) {
        finalName = generateBindingName(baseName, workflowId);
      } else {
        const tempWorkflowId = generateWorkflowId();
        finalName = generateBindingName(baseName, tempWorkflowId);
      }
    }

    return {
      name: finalName,
      type: bindingType,
      usage: usages.map(u => ({
        nodeId: u.nodeId,
        nodeLabel: u.nodeLabel,
        nodeType: u.nodeType
      }))
    };
  });

  if (hasMCPNodes) {
    const mcpNodes = codegenResults.filter(
      r => r.nodeType === "mcp-tool-input" || r.nodeType === "mcp-tool-output"
    );

    let mcpBindingName: string;
    let workflowBindingName: string;
    if (workflowId) {
      mcpBindingName = generateBindingName("MCP", workflowId);
      const workflowClassName = generateClassName(workflowId);
      workflowBindingName = `${workflowClassName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")}_WORKFLOW`;
    } else {
      const tempWorkflowId = generateWorkflowId();
      mcpBindingName = generateBindingName("MCP", tempWorkflowId);
      const workflowClassName = generateClassName(tempWorkflowId);
      workflowBindingName = `${workflowClassName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")}_WORKFLOW`;
    }

    bindings.push({
      name: mcpBindingName,
      type: BindingType.DURABLE_OBJECT,
      usage: mcpNodes.map(n => ({
        nodeId: n.nodeId,
        nodeLabel: n.nodeLabel,
        nodeType: n.nodeType
      }))
    });

    bindings.push({
      name: workflowBindingName,
      type: BindingType.WORKFLOW,
      usage: mcpNodes.map(n => ({
        nodeId: n.nodeId,
        nodeLabel: n.nodeLabel,
        nodeType: n.nodeType
      }))
    });
  }

  return bindings;
};

export const generateWranglerBindings = (
  bindings: BindingConfiguration[]
): Record<string, any> => {
  const wranglerBindings: Record<string, any> = {};

  bindings.forEach(binding => {
    switch (binding.type) {
      case BindingType.KV:
        wranglerBindings.kv_namespaces = wranglerBindings.kv_namespaces || [];
        wranglerBindings.kv_namespaces.push({
          binding: binding.name,
          id: "",
          preview_id: ""
        });
        break;
      case BindingType.D1:
        wranglerBindings.d1_databases = wranglerBindings.d1_databases || [];
        wranglerBindings.d1_databases.push({
          binding: binding.name,
          database_name: binding.name,
          database_id: ""
        });
        break;
      case BindingType.AI:
        wranglerBindings.ai = wranglerBindings.ai || {};
        wranglerBindings.ai.binding = binding.name;
        break;
      case BindingType.R2:
        wranglerBindings.r2_buckets = wranglerBindings.r2_buckets || [];
        const bucketName = binding.bucketName || binding.name;
        wranglerBindings.r2_buckets.push({
          binding: binding.name,
          bucket_name: bucketName
        });
        break;
      case BindingType.SERVICE:
        wranglerBindings.services = wranglerBindings.services || [];
        wranglerBindings.services.push({
          binding: binding.name,
          service: binding.name
        });
        break;
      case BindingType.DURABLE_OBJECT:
        wranglerBindings.durable_objects =
          wranglerBindings.durable_objects || {};
        wranglerBindings.durable_objects.bindings =
          wranglerBindings.durable_objects.bindings || [];
        wranglerBindings.durable_objects.bindings.push({
          name: binding.name,
          class_name: binding.name,
          script_name: binding.name
        });
        break;
    }
  });

  return wranglerBindings;
};
