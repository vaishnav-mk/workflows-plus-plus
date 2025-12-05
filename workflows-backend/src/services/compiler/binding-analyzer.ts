/**
 * Binding Analyzer - Aggregates and analyzes bindings
 */

import { BindingType } from "../../core/enums";
import { CodeGenResult } from "../../core/types";
import { generateBindingName } from "../../core/utils/id-generator";

export interface BindingUsage {
  name: string;
  type: BindingType;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
}

export class BindingAnalyzer {
  /**
   * Aggregate bindings from codegen results
   */
  static aggregateBindings(
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
  }> {
    const bindingMap = new Map<string, BindingUsage[]>();

    // Check if workflow has MCP nodes
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

    // Generate binding names with format: binding_{BINDINGNAME}_{workflowId}
    // Example: binding_KV_sacred-tick-satisfied
    // Exception: D1 bindings use the actual database name directly
    const bindings = Array.from(bindingMap.values()).map(usages => {
      const bindingType = usages[0].type;
      const originalName = usages[0].name;
      const baseName = originalName.toUpperCase().replace(/[^A-Z0-9]/g, "_");

      // Generate the binding name using standardized format
      let finalName: string;
      if (bindingType === BindingType.AI) {
        // Always use the stable binding name "AI" so runtime code can safely
        // reference this.env.AI regardless of workflow ID.
        finalName = "AI";
      } else if (bindingType === BindingType.D1) {
        // For D1 bindings, use the actual database name but sanitize it to match
        // how it's used in the generated code (this.env["${db}"])
        // The codegen sanitizes with: .replace(/[^a-zA-Z0-9_]/g, "_")
        finalName = originalName.replace(/[^a-zA-Z0-9_]/g, "_");
      } else {
        if (workflowId) {
          // Use the standardized format: binding_{name}_{workflowid}
          finalName = generateBindingName(baseName, workflowId);
        } else {
          // Fallback: generate a temporary workflow ID if none provided
          const { generateWorkflowId } = require("../../core/utils/id-generator");
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

    // Add MCP durable object binding if MCP nodes are present
    if (hasMCPNodes) {
      const mcpNodes = codegenResults.filter(
        r => r.nodeType === "mcp-tool-input" || r.nodeType === "mcp-tool-output"
      );

      // Generate MCP binding name
      let mcpBindingName: string;
      let workflowBindingName: string;
      if (workflowId) {
        mcpBindingName = generateBindingName("MCP", workflowId);
        // Derive the workflow binding name in the same way as the compiler:
        // CLASSNAME_WORKFLOW_WORKFLOW, where CLASSNAME comes from workflowId.
        const { generateClassName } = require("../../core/utils/id-generator");
        const workflowClassName = generateClassName(workflowId);
        workflowBindingName = `${workflowClassName
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "_")}_WORKFLOW`;
      } else {
        const {
          generateWorkflowId,
          generateClassName
        } = require("../../core/utils/id-generator");
        const tempWorkflowId = generateWorkflowId();
        mcpBindingName = generateBindingName("MCP", tempWorkflowId);
        const workflowClassName = generateClassName(tempWorkflowId);
        workflowBindingName = `${workflowClassName
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "_")}_WORKFLOW`;
      }

      // 1) MCP Durable Object binding (real CF binding)
      bindings.push({
        name: mcpBindingName,
        type: BindingType.DURABLE_OBJECT,
        usage: mcpNodes.map(n => ({
          nodeId: n.nodeId,
          nodeLabel: n.nodeLabel,
          nodeType: n.nodeType
        }))
      });

      // 2) Workflow binding (for UI / generated code visibility only).
      // This is not a real Cloudflare binding type, so it will be ignored
      // by wrangler bindings / transformBindingsForAPI.
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
  }

  /**
   * Generate wrangler config bindings section
   */
  static generateWranglerBindings(
    bindings: Array<{
      name: string;
      type: BindingType;
      usage: Array<{ nodeId: string; nodeLabel: string; nodeType: string }>;
    }>
  ): Record<string, any> {
    const wranglerBindings: Record<string, any> = {};

    bindings.forEach(binding => {
      switch (binding.type) {
        case BindingType.KV:
          wranglerBindings.kv_namespaces = wranglerBindings.kv_namespaces || [];
          wranglerBindings.kv_namespaces.push({
            binding: binding.name,
            id: "", // Will be filled by deployment
            preview_id: ""
          });
          break;
        case BindingType.D1:
          wranglerBindings.d1_databases = wranglerBindings.d1_databases || [];
          wranglerBindings.d1_databases.push({
            binding: binding.name,
            database_name: binding.name,
            database_id: "" // Will be filled by deployment
          });
          break;
        case BindingType.AI:
          wranglerBindings.ai = wranglerBindings.ai || {};
          wranglerBindings.ai.binding = binding.name;
          break;
        case BindingType.R2:
          wranglerBindings.r2_buckets = wranglerBindings.r2_buckets || [];
          wranglerBindings.r2_buckets.push({
            binding: binding.name,
            bucket_name: binding.name
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
  }
}
