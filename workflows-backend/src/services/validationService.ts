import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowValidationResult
} from "../types/workflow";

export class ValidationService {
  validateWorkflow(workflow: Partial<Workflow>): WorkflowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!workflow.name || workflow.name.trim().length === 0) {
      workflow.name = workflow.name || "Unnamed Workflow";
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      workflow.nodes = [];
    }

    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      workflow.edges = [];
    }

    if (workflow.nodes && workflow.nodes.length === 0) {
      warnings.push("Workflow has no nodes");
    }

    if (workflow.nodes) {
      const nodeValidation = this.validateNodes(workflow.nodes);
      errors.push(...nodeValidation.errors);
      warnings.push(...nodeValidation.warnings);
    }

    if (workflow.edges) {
      const edgeValidation = this.validateEdges(
        workflow.edges,
        workflow.nodes || []
      );
      errors.push(...edgeValidation.errors);
      warnings.push(...edgeValidation.warnings);
    }

    if (workflow.nodes && workflow.edges) {
      const cycleCheck = this.detectCycles(workflow.nodes, workflow.edges);
      if (cycleCheck.hasCycle) {
        errors.push("Workflow contains cycles");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateNodes(
    nodes: WorkflowNode[]
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nodeIds = new Set<string>();

    for (const node of nodes) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);

      if (!node.id || node.id.trim().length === 0) {
        errors.push("Node ID is required");
      }

      if (!node.type || node.type.trim().length === 0) {
        errors.push(`Node ${node.id} must have a type`);
      }

      if (!node.data || !node.data.label) {
        warnings.push(`Node ${node.id} should have a label`);
      }

      if (
        !node.position ||
        typeof node.position.x !== "number" ||
        typeof node.position.y !== "number"
      ) {
        warnings.push(`Node ${node.id} should have valid position coordinates`);
      }
    }

    return { errors, warnings };
  }

  private validateEdges(
    edges: WorkflowEdge[],
    nodes: WorkflowNode[]
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nodeIds = new Set((nodes || []).map(n => n.id));
    const edgeIds = new Set<string>();

    for (const edge of edges) {
      if (!edge.id || edge.id.trim().length === 0) {
        edge.id = `edge-${edge.source}-${edge.target}`;
      }

      if (edgeIds.has(edge.id)) {
        errors.push(`Duplicate edge ID: ${edge.id}`);
      }
      edgeIds.add(edge.id);

      if (!edge.source || !edge.target) {
        errors.push(`Edge ${edge.id} must have source and target`);
      }

      if (edge.source && !nodeIds.has(edge.source)) {
        errors.push(
          `Edge ${edge.id} references non-existent source node: ${edge.source}`
        );
      }

      if (edge.target && !nodeIds.has(edge.target)) {
        errors.push(
          `Edge ${edge.id} references non-existent target node: ${edge.target}`
        );
      }

      if (edge.source === edge.target) {
        warnings.push(`Edge ${edge.id} is a self-loop`);
      }
    }

    return { errors, warnings };
  }

  private detectCycles(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): { hasCycle: boolean; cyclePath?: string[] } {
    const graph = new Map<string, string[]>();

    for (const node of nodes) {
      graph.set(node.id, []);
    }

    for (const edge of edges) {
      const neighbors = graph.get(edge.source) || [];
      neighbors.push(edge.target);
      graph.set(edge.source, neighbors);
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor, path)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      path.pop();
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const path: string[] = [];
        if (dfs(node.id, path)) {
          return { hasCycle: true, cyclePath: path };
        }
      }
    }

    return { hasCycle: false };
  }
}
