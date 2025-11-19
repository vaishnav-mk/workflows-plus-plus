import { create } from "zustand";
import { Node, Edge } from "reactflow";
import { NodeFactory } from "../nodes/nodeFactory";
import { ValidationService } from "../services/validationService";
import { toast } from "./toastStore";

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  showCodePreview: boolean;
  backendCode: string | undefined;
  backendBindings: any[] | undefined;
  validationErrors: string[];
  registry: { nodes: { name: string; category: string }[] } | null;
  loading: boolean;
  mcpEnabled: boolean;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (nodeType: string) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: any) => void;
  setSelectedNode: (node: Node | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;
  insertNodeBetweenEdge: (edgeId: string, nodeType: string) => void;
  setShowCodePreview: (show: boolean) => void;
  setBackendCode: (code: string | undefined) => void;
  setBackendBindings: (bindings: any[] | undefined) => void;
  validateWorkflow: () => Promise<void>;
  setValidationErrors: (errors: string[]) => void;
  setRegistry: (
    registry: { nodes: { name: string; category: string }[] } | null
  ) => void;
  setLoading: (loading: boolean) => void;
  setMCPEnabled: (enabled: boolean) => void;
  initializeWorkflow: () => Promise<void>;
  saveWorkflowToStorage: (workflow: any) => void;
  loadWorkflowFromStorage: (workflowId: string) => any | null;
  applyWorkflowToState: (workflow: any) => Promise<void>;
}

// Utility function to calculate centered node positions
const calculateNodePositions = (
  nodeCount: number,
  options?: {
    nodeWidth?: number;
    nodeHeight?: number;
    verticalSpacing?: number;
    startY?: number;
    containerWidth?: number;
  }
): Array<{ x: number; y: number }> => {
  const {
    nodeWidth = 200,
    nodeHeight = 100,
    verticalSpacing = 80,
    startY = 100,
    containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  } = options || {};

  // Calculate center X position
  const centerX = (containerWidth / 2) - (nodeWidth / 2);

  // Calculate positions for each node
  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < nodeCount; i++) {
    positions.push({
      x: centerX,
      y: startY + (i * (nodeHeight + verticalSpacing))
    });
  }

  return positions;
};

const setupMCPNodes = (state: WorkflowState, set: any) => {
  const { nodes, edges } = state;
  
  const entryNode = nodes.find(n => n.data?.type === 'entry');
  const returnNode = nodes.find(n => n.data?.type === 'return');
  const mcpInputNode = nodes.find(n => n.data?.type === 'mcp-tool-input');
  const mcpOutputNode = nodes.find(n => n.data?.type === 'mcp-tool-output');
  
  if (mcpInputNode && mcpOutputNode) {
    return;
  }
  
  const newNodes = [...nodes];
  const newEdges = [...edges];
  
  if (!mcpInputNode && entryNode) {
    const workflowName = state.nodes.length > 0 ? 'workflow_tool' : 'execute_workflow';
    const mcpInput = NodeFactory.createNode('mcp-tool-input' as any, entryNode.position);
    const mcpInputReactNode: Node = {
      id: mcpInput.id,
      type: "workflow",
      position: entryNode.position,
      data: {
        label: "MCP Tool Input",
        type: "mcp-tool-input",
        icon: "Input",
        description: "Define tool parameters exposed via MCP",
        status: "idle",
        config: {
          toolName: workflowName,
          description: "Execute workflow via MCP",
          parameters: []
        }
      }
    };
    
    const entryEdges = edges.filter(e => e.source === entryNode.id);
    newNodes.splice(newNodes.indexOf(entryNode), 1, mcpInputReactNode);
    
    entryEdges.forEach(edge => {
      const edgeIndex = newEdges.indexOf(edge);
      if (edgeIndex >= 0) {
        newEdges[edgeIndex] = { ...edge, source: mcpInput.id };
      }
    });
    
    toast.success("MCP Enabled", "Entry node replaced with MCP Tool Input");
  } else if (!mcpInputNode) {
    const workflowName = state.nodes.length > 0 ? 'workflow_tool' : 'execute_workflow';
    const mcpInput = NodeFactory.createNode('mcp-tool-input' as any, { x: 200, y: 100 });
    const mcpInputReactNode: Node = {
      id: mcpInput.id,
      type: "workflow",
      position: { x: 200, y: 100 },
      data: {
        label: "MCP Tool Input",
        type: "mcp-tool-input",
        icon: "Input",
        description: "Define tool parameters exposed via MCP",
        status: "idle",
        config: {
          toolName: workflowName,
          description: "Execute workflow via MCP",
          parameters: []
        }
      }
    };
    newNodes.unshift(mcpInputReactNode);
  }
  
  if (!mcpOutputNode && returnNode) {
    const mcpOutput = NodeFactory.createNode('mcp-tool-output' as any, returnNode.position);
    const mcpOutputReactNode: Node = {
      id: mcpOutput.id,
      type: "workflow",
      position: returnNode.position,
      data: {
        label: "MCP Tool Output",
        type: "mcp-tool-output",
        icon: "Output",
        description: "Format workflow output as MCP tool response",
        status: "idle",
        config: mcpOutput.data.config || {
          format: "json"
        }
      }
    };
    
    const returnEdges = edges.filter(e => e.target === returnNode.id);
    newNodes.splice(newNodes.indexOf(returnNode), 1, mcpOutputReactNode);
    
    returnEdges.forEach(edge => {
      const edgeIndex = newEdges.indexOf(edge);
      if (edgeIndex >= 0) {
        newEdges[edgeIndex] = { ...edge, target: mcpOutput.id };
      }
    });
    
    toast.success("MCP Enabled", "Return node replaced with MCP Tool Output");
  } else if (!mcpOutputNode) {
    const mcpOutput = NodeFactory.createNode('mcp-tool-output' as any, { x: 200, y: 500 });
    const mcpOutputReactNode: Node = {
      id: mcpOutput.id,
      type: "workflow",
      position: { x: 200, y: 500 },
      data: {
        label: "MCP Tool Output",
        type: "mcp-tool-output",
        icon: "Output",
        description: "Format workflow output as MCP tool response",
        status: "idle",
        config: mcpOutput.data.config || {
          format: "json"
        }
      }
    };
    newNodes.push(mcpOutputReactNode);
  }
  
  set({ nodes: newNodes, edges: newEdges });
};

const removeMCPNodes = (state: WorkflowState, set: any) => {
  const { nodes, edges } = state;
  
  const mcpInputNode = nodes.find(n => n.data?.type === 'mcp-tool-input');
  const mcpOutputNode = nodes.find(n => n.data?.type === 'mcp-tool-output');
  
  if (!mcpInputNode && !mcpOutputNode) {
    return;
  }
  
  const newNodes = [...nodes];
  const newEdges = [...edges];
  
  if (mcpInputNode) {
    const entry = NodeFactory.createNode('entry' as any, mcpInputNode.position);
    const entryReactNode: Node = {
      id: entry.id,
      type: "workflow",
      position: mcpInputNode.position,
      data: {
        label: "Start",
        type: "entry",
        icon: "Play",
        description: "Workflow begins here",
        status: "idle",
        config: {}
      }
    };
    
    const mcpInputEdges = edges.filter(e => e.source === mcpInputNode.id);
    newNodes.splice(newNodes.indexOf(mcpInputNode), 1, entryReactNode);
    
    mcpInputEdges.forEach(edge => {
      const edgeIndex = newEdges.indexOf(edge);
      if (edgeIndex >= 0) {
        newEdges[edgeIndex] = { ...edge, source: entry.id };
      }
    });
  }
  
  if (mcpOutputNode) {
    const returnNode = NodeFactory.createNode('return' as any, mcpOutputNode.position);
    const returnReactNode: Node = {
      id: returnNode.id,
      type: "workflow",
      position: mcpOutputNode.position,
      data: {
        label: "End",
        type: "return",
        icon: "CheckCircle",
        description: "Workflow ends here",
        status: "idle",
        config: {}
      }
    };
    
    const mcpOutputEdges = edges.filter(e => e.target === mcpOutputNode.id);
    newNodes.splice(newNodes.indexOf(mcpOutputNode), 1, returnReactNode);
    
    mcpOutputEdges.forEach(edge => {
      const edgeIndex = newEdges.indexOf(edge);
      if (edgeIndex >= 0) {
        newEdges[edgeIndex] = { ...edge, target: returnNode.id };
      }
    });
  }
  
  toast.success("MCP Disabled", "MCP nodes replaced with standard entry/return nodes");
  set({ nodes: newNodes, edges: newEdges });
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  showCodePreview: false,
  backendCode: undefined,
  backendBindings: undefined,
  validationErrors: [],
  registry: null,
  loading: false,
  mcpEnabled: false,
  setNodes: nodes => set({ nodes }),
  setEdges: edges => set({ edges }),
  setMCPEnabled: (enabled: boolean) => {
    const state = get();
    if (enabled) {
      setupMCPNodes(state, set);
    } else {
      removeMCPNodes(state, set);
    }
    set({ mcpEnabled: enabled });
  },

  addNode: (nodeType: string) => {
    try {
      const state = get();
      const existingNodes = state.nodes;
      
      // Calculate centered position for new node
      const nodeWidth = 200;
      const nodeHeight = 100;
      const verticalSpacing = 80;
      const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const centerX = (containerWidth / 2) - (nodeWidth / 2);
      
      const baseNode = NodeFactory.createNode(nodeType as any, {
        x: centerX,
        y: 100 // Temporary position, will be recalculated
      });

      const newNode: Node = {
        id: baseNode.id,
        type: "workflow",
        position: baseNode.position,
        data: {
          label: baseNode.metadata.label,
          type: baseNode.type,
          icon: baseNode.metadata.icon,
          description: baseNode.metadata.description,
          status: "idle",
          config: baseNode.data.config
        }
      };

      // Add the new node first
      const allNodes = [...existingNodes, newNode];
      
      // Redistribute all nodes with equal spacing
      const startY = 100;
      const redistributedNodes = allNodes.map((node, index) => ({
        ...node,
        position: {
          x: centerX,
          y: startY + (index * (nodeHeight + verticalSpacing))
        }
      }));

      set(state => ({ nodes: redistributedNodes }));
      
      // Trigger auto-fit after nodes are rendered to ensure all nodes are visible
      setTimeout(() => {
        const canvas = document.querySelector('.workflow-canvas');
        if (canvas) {
          const event = new CustomEvent('workflow-auto-fit');
          canvas.dispatchEvent(event);
        }
      }, 200);
      
      toast.success(
        "Node Added",
        `${nodeType} node added to workflow`
      );
    } catch (error) {
      toast.error(
        "Failed to Create Node",
        `Failed to create ${nodeType} node: ${(error as Error).message}`
      );
    }
  },

  removeNode: (nodeId: string) => {
    set(state => {
      const updatedNodes = state.nodes.filter(node => node.id !== nodeId);
      
      const updatedEdges = state.edges.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
      );
      
      toast.success(
        "Node Removed",
        "Node and connected edges removed from workflow"
      );
      
      return { 
        nodes: updatedNodes, 
        edges: updatedEdges,
        selectedNode: state.selectedNode?.id === nodeId ? null : state.selectedNode
      };
    });
  },

  updateNode: (nodeId: string, updates: any) => {
    set(state => {
      const updatedNodes = state.nodes.map(
        n => (n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n)
      );
      const updatedSelected = state.selectedNode && state.selectedNode.id === nodeId
        ? updatedNodes.find(n => n.id === nodeId) || null
        : state.selectedNode;
      return {
        nodes: updatedNodes,
        selectedNode: updatedSelected
      };
    });
  },

  setSelectedNode: node => set({ selectedNode: node }),
  setSelectedEdge: edge => set({ selectedEdge: edge }),

  insertNodeBetweenEdge: (edgeId: string, nodeType: string) => {
    const { nodes, edges } = get();
    const edge = edges.find(e => (e as any).id === edgeId);
    const isVirtualAfter = edgeId.startsWith('after-');
    const afterNodeId = isVirtualAfter ? edgeId.replace('after-', '') : undefined;
    if (!edge && !afterNodeId) {
      toast.error("Edge Not Found", `No edge with id ${edgeId}`);
      return;
    }

    try {
      const baseNode = NodeFactory.createNode(nodeType as any, {
        x: 0,
        y: 0
      });

      const sourceNode = afterNodeId ? nodes.find(n => n.id === afterNodeId) : nodes.find(n => n.id === (edge as any).source);
      const targetNode = afterNodeId ? undefined : nodes.find(n => n.id === (edge as any).target);
      
      let newX, newY;
      if (sourceNode && targetNode) {
        const dx = targetNode.position.x - sourceNode.position.x;
        const dy = targetNode.position.y - sourceNode.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const spacing = Math.min(150, distance * 0.4);
        
        newX = sourceNode.position.x + (dx * spacing) / distance;
        newY = sourceNode.position.y + (dy * spacing) / distance;
      } else if (sourceNode) {
        newX = sourceNode.position.x;
        newY = sourceNode.position.y + 200;
      } else {
        newX = Math.random() * 400 + 100;
        newY = Math.random() * 400 + 100;
      }

      const newNode: Node = {
        id: baseNode.id,
        type: "workflow",
        position: { x: newX, y: newY },
        data: {
          label: baseNode.metadata.label,
          type: baseNode.type,
          icon: baseNode.metadata.icon,
          description: baseNode.metadata.description,
          status: "idle",
          config: baseNode.data.config
        }
      };

      const newEdges: Edge[] = [] as any;
      if (isVirtualAfter && afterNodeId) {
        newEdges.push({ id: `${afterNodeId}-${newNode.id}` as any, source: afterNodeId as any, target: newNode.id } as any);
      } else if (edge) {
        newEdges.push({ id: `${(edge as any).source}-${newNode.id}` as any, source: (edge as any).source, target: newNode.id } as any);
        newEdges.push({ id: `${newNode.id}-${(edge as any).target}` as any, source: newNode.id, target: (edge as any).target } as any);
      }

      set(state => ({
        nodes: [...state.nodes, newNode],
        edges: isVirtualAfter
          ? [...state.edges, ...newEdges]
          : [
              ...state.edges.filter(e => (e as any).id !== edgeId),
              ...newEdges
            ],
        selectedEdge: null
      }));

      setTimeout(() => {
        const canvas = document.querySelector('.workflow-canvas');
        if (canvas) {
          const event = new CustomEvent('workflow-auto-fit');
          canvas.dispatchEvent(event);
        }
      }, 100);

      toast.success("Node Inserted", `${nodeType} inserted between nodes`);
    } catch (error) {
      toast.error(
        "Insertion Failed",
        `Failed to insert ${nodeType}: ${(error as Error).message}`
      );
    }
  },
  setShowCodePreview: show => set({ showCodePreview: show }),
  setBackendCode: code => set({ backendCode: code }),
  setBackendBindings: bindings => set({ backendBindings: bindings }),
  validateWorkflow: async () => {
    const { nodes, edges } = get();
    const result = await ValidationService.validateWithBackend(
      nodes,
      edges,
      "http://localhost:8787/api"
    );
    set({ validationErrors: result.errors });
  },
  setValidationErrors: errors => set({ validationErrors: errors }),
  setRegistry: registry => set({ registry }),
  setLoading: loading => set({ loading }),
  initializeWorkflow: async () => {
    set({ loading: true });
    try {
      const { NodeFactory } = await import("../nodes/nodeFactory");
      
      // Calculate centered positions dynamically
      const nodeTypes = ["entry", "http-request", "kv-put", "kv-get", "return"];
      const positions = calculateNodePositions(nodeTypes.length);
      
      const entryNode = NodeFactory.createNode("entry", positions[0]);
      const httpNode = NodeFactory.createNode("http-request", positions[1]);
      const kvPutNode = NodeFactory.createNode("kv-put", positions[2]);
      const kvGetNode = NodeFactory.createNode("kv-get", positions[3]);
      const returnNode = NodeFactory.createNode("return", positions[4]);

      const starterNodes = [
        {
          id: entryNode.id,
          type: "workflow",
          position: entryNode.position,
          data: {
            label: "Start",
            type: "entry",
            icon: "Play",
            description: "Workflow begins here",
            status: "idle",
            config: {}
          }
        },
        {
          id: httpNode.id,
          type: "workflow",
          position: httpNode.position,
          data: {
            label: "API Call",
            type: "http-request",
            icon: "Globe",
            description: "POST to api.agify.io with name=steve",
            status: "idle",
            config: {
              url: "https://api.agify.io?name=steve",
              method: "POST",
              headers: [],
              body: {
                type: "none",
                content: ""
              },
              timeout: 30000
            }
          }
        },
        {
          id: kvPutNode.id,
          type: "workflow",
          position: kvPutNode.position,
          data: {
            label: "Store Data",
            type: "kv-put",
            icon: "Database",
            description: "Store name: vaish in KV",
            status: "idle",
            config: {
              key: "name",
              value: { type: "static", content: "vaish" },
              namespace: "WORKFLOWS_KV"
            }
          }
        },
        {
          id: kvGetNode.id,
          type: "workflow",
          position: kvGetNode.position,
          data: {
            label: "Retrieve Data",
            type: "kv-get",
            icon: "Database",
            description: "Get value for key 'name'",
            status: "idle",
            config: {
              key: "name",
              namespace: "WORKFLOWS_KV",
              type: "text"
            }
          }
        },
        {
          id: returnNode.id,
          type: "workflow",
          position: returnNode.position,
          data: {
            label: "End",
            type: "return",
            icon: "CheckCircle",
            description: "Workflow completes",
            status: "idle",
            config: {
              value: `{{state.${kvGetNode.id}.output.value}}`
            }
          }
        }
      ];

      const starterEdges = [
        {
          id: "entry-http",
          source: entryNode.id,
          target: httpNode.id,
          type: "straight",
          animated: true
        },
        {
          id: "http-kvput",
          source: httpNode.id,
          target: kvPutNode.id,
          type: "straight",
          animated: true
        },
        {
          id: "kvput-kvget",
          source: kvPutNode.id,
          target: kvGetNode.id,
          type: "straight",
          animated: true
        },
        {
          id: "kvget-return",
          source: kvGetNode.id,
          target: returnNode.id,
          type: "straight",
          animated: true
        }
      ];

      set({
        nodes: starterNodes,
        edges: starterEdges,
        loading: false
      });
    } catch (error) {
      set({ loading: false });
    }
  },

  saveWorkflowToStorage: (workflow) => {
    try {
      const workflowId = workflow.id || (globalThis as any).crypto?.randomUUID() || `workflow-${Date.now()}`;
      const workflowDef = {
        ...workflow,
        id: workflowId,
        metadata: {
          ...workflow.metadata,
          createdAt: workflow.metadata?.createdAt || Date.now(),
          updatedAt: Date.now(),
          generatedByAI: true
        }
      };
      const key = `workflow-${workflowId}`;
      localStorage.setItem(key, JSON.stringify(workflowDef));
    } catch (error) {
      toast.error("Storage Error", "Failed to save workflow");
    }
  },

  loadWorkflowFromStorage: (workflowId) => {
    try {
      const key = `workflow-${workflowId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  applyWorkflowToState: async (workflow) => {
    set({ loading: true });
    try {
      const API_BASE = (process as any).env?.NEXT_PUBLIC_API_BASE || 'http://localhost:8787/api';
      let nodeRegistry: Record<string, { icon: string; description: string }> = {};
      
      try {
        const registryResponse = await fetch(`${API_BASE}/nodes`);
        const registryData = await registryResponse.json();
        if (registryData.success && registryData.data) {
          registryData.data.forEach((nodeDef: any) => {
            nodeRegistry[nodeDef.metadata.type] = {
              icon: nodeDef.metadata.icon,
              description: nodeDef.metadata.description
            };
          });
        }
      } catch (regError) {
      }

      const mappedNodes: Node[] = (workflow.nodes || []).map((node: any) => {
        const registryInfo = nodeRegistry[node.type] || { icon: "Circle", description: node.label || "" };
        
        return {
          id: node.id,
          type: "workflow",
          position: node.position || { x: 200, y: 100 },
          data: {
            label: node.label || node.type,
            type: node.type,
            icon: registryInfo.icon,
            description: registryInfo.description,
            status: "idle",
            config: node.config || {}
          }
        };
      });

      const mappedEdges: Edge[] = (workflow.edges || []).map((edge: any) => ({
        id: edge.id || `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: edge.type || "straight",
        animated: true
      }));

      set({
        nodes: mappedNodes,
        edges: mappedEdges,
        loading: false
      });

      setTimeout(() => {
        const canvas = document.querySelector('.workflow-canvas');
        if (canvas) {
          const event = new CustomEvent('workflow-auto-fit');
          canvas.dispatchEvent(event);
        }
      }, 100);

      toast.success(
        "Workflow Loaded",
        "Workflow has been applied to canvas"
      );
    } catch (error) {
      set({ loading: false });
      toast.error(
        "Failed to Load Workflow",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}));
