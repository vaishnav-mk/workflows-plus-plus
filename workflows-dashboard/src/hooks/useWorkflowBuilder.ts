import { useState, useCallback, useEffect } from "react";
import { Node, Edge } from "reactflow";
import { NodeFactory } from "../nodes/nodeFactory";
import { ValidationService } from "../services/validationService";
import { useApi } from "./useApi";
import { toast } from "../stores/toastStore";

export function useWorkflowBuilder() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [registry, setRegistry] = useState<{
    nodes: { name: string; category: string }[];
  } | null>(null);

  const { fetchNodes, validateWorkflow } = useApi();

  useEffect(
    () => {
      const loadInitialData = async () => {
        try {
          const registryData = await fetchNodes();

          setNodes([]);
          setEdges([]);

          if (registryData.data) {
            setRegistry(registryData.data);
          }
        } catch (error) {
        }
      };

      loadInitialData();
    },
    [fetchNodes]
  );

  const addNode = useCallback((nodeType: string) => {
    try {
      const baseNode = NodeFactory.createNode(nodeType as any, {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100
      });

      const newNode: Node = {
        id: baseNode.id,
        type: "workflow",
        position: baseNode.position,
        data: {
          label: baseNode.metadata.label,
          type: baseNode.type,
          icon: "📦",
          description: baseNode.metadata.description,
          status: "idle",
          config: baseNode.data.config
        }
      };
      setNodes(prev => [...prev, newNode]);
      toast.success("Node Added", `${nodeType} node added to workflow`);
    } catch (error) {
      toast.error(
        "Failed to Create Node",
        `Failed to create ${nodeType} node: ${(error as Error).message}`
      );
    }
  }, []);

  const handleValidateClick = useCallback(
    async () => {
      const result = await ValidationService.validateWithBackend(
        nodes,
        edges,
        "http://localhost:8787/api"
      );
      setValidationErrors(result.errors);

      if (result.errors.length === 0) {
        toast.success(
          "Validation Passed",
          "Workflow is valid and ready for deployment"
        );
      } else {
        toast.warning(
          "Validation Issues",
          `${result.errors.length} validation error(s) found`
        );
      }
    },
    [nodes, edges]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const handleNodeUpdate = useCallback((nodeId: string, updates: any) => {
    setNodes(prev =>
      prev.map(
        n => (n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n)
      )
    );
  }, []);

  useEffect(
    () => {
      const result = ValidationService.validateWorkflow(nodes, edges);
      setValidationErrors(result.errors);
    },
    [nodes, edges]
  );

  return {
    nodes,
    setNodes,
    edges,
    setEdges,
    selectedNode,
    setSelectedNode,
    validationErrors,
    registry,
    addNode,
    handleValidateClick,
    handleNodeClick,
    handleNodeUpdate
  };
}
