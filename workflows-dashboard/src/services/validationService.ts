import type { Node, Edge } from 'reactflow';
import { apiClient } from '../lib/api-client';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationService {
  static validateWorkflow(nodes: Node[], edges: Edge[]): ValidationResult {
    const errors: string[] = [];
    
    const entryNodes = nodes.filter(node => {
      const type = node.data?.type;
      return type === 'entry' || type === 'flow/entry' || type === 'mcp-tool-input';
    });
    if (entryNodes.length === 0) {
      errors.push('Workflow must have exactly one start node (entry or mcp-tool-input)');
    } else if (entryNodes.length > 1) {
      errors.push('Workflow can only have one start node (entry or mcp-tool-input)');
    }
    
    const returnNodes = nodes.filter(node => {
      const type = node.data?.type;
      return type === 'return' || type === 'flow/return' || type === 'mcp-tool-output';
    });
    if (returnNodes.length === 0) {
      errors.push('Workflow must have exactly one end node (return or mcp-tool-output)');
    } else if (returnNodes.length > 1) {
      errors.push('Workflow can only have one end node (return or mcp-tool-output)');
    }
    
    const connectedNodes = new Set();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    
    nodes.forEach(node => {
      const nodeType = node.data?.type;
      const isEntryOrReturn = nodeType === 'entry' || nodeType === 'flow/entry' || 
                              nodeType === 'return' || nodeType === 'flow/return' ||
                              nodeType === 'mcp-tool-input' || nodeType === 'mcp-tool-output';
      if (!isEntryOrReturn && !connectedNodes.has(node.id)) {
        errors.push(`Node "${node.data?.label || 'Unknown'}" is not connected to the workflow`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async validateWithBackend(nodes: Node[], edges: Edge[], _apiBase?: string): Promise<ValidationResult> {
    const localValidation = this.validateWorkflow(nodes, edges);
    
    try {
      const workflow = {
        name: "Generated Workflow",
        nodes: nodes.map(n => ({ id: n.id, type: n.data?.type, config: n.data?.config })),
        edges: edges.map((e, index) => ({ 
          id: e.id || `edge-${e.source}-${e.target}-${index}`,
          source: e.source, 
          target: e.target 
        }))
      };
      
      const result = await apiClient.validateWorkflow(workflow);
      if (result.success && result.data) {
        const backendValid = result.data.valid !== false;
        const backendErrors = result.data.errors || [];
        return {
          isValid: backendValid && localValidation.isValid,
          errors: [...localValidation.errors, ...backendErrors]
        };
      }
    } catch (e) {
      // Fallback to local validation on error
    }
    
    return localValidation;
  }
}
