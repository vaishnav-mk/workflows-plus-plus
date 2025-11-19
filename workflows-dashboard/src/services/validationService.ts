import { Node, Edge } from 'reactflow';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationService {
  static validateWorkflow(nodes: Node[], edges: Edge[]): ValidationResult {
    const errors: string[] = [];
    
    const entryNodes = nodes.filter(node => node.data?.type === 'entry');
    if (entryNodes.length === 0) {
      errors.push('Workflow must have exactly one start node (entry)');
    } else if (entryNodes.length > 1) {
      errors.push('Workflow can only have one start node (entry)');
    }
    
    const returnNodes = nodes.filter(node => node.data?.type === 'return');
    if (returnNodes.length === 0) {
      errors.push('Workflow must have exactly one end node (return)');
    } else if (returnNodes.length > 1) {
      errors.push('Workflow can only have one end node (return)');
    }
    
    const connectedNodes = new Set();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    
    nodes.forEach(node => {
      if (node.data?.type !== 'entry' && node.data?.type !== 'return' && !connectedNodes.has(node.id)) {
        errors.push(`Node "${node.data?.label || 'Unknown'}" is not connected to the workflow`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async validateWithBackend(nodes: Node[], edges: Edge[], apiBase: string): Promise<ValidationResult> {
    const localValidation = this.validateWorkflow(nodes, edges);
    
    try {
      const resp = await fetch(`${apiBase}/workflows/validate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: "Generated Workflow",
          nodes: nodes.map(n => ({ id: n.id, type: n.data?.type, config: n.data?.config })),
          edges: edges.map((e, index) => ({ 
            id: e.id || `edge-${e.source}-${e.target}-${index}`,
            source: e.source, 
            target: e.target 
          }))
        })
      });
      const json = await resp.json();
      if (!json.data?.valid) {
        return {
          isValid: false,
          errors: [...localValidation.errors, ...(json.data?.errors || [])]
        };
      }
    } catch (e) {
    }
    
    return localValidation;
  }
}
