/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext } from 'react';

interface WorkflowContextType {
  onBrainClick: (nodeId: string, description: string) => void;
  onBrainAccept: (nodeId: string, suggestions: any[]) => void;
  nodes: any[];
  edges: any[];
}

const WorkflowContext = createContext<WorkflowContextType | null>(null);

export const useWorkflowContext = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflowContext must be used within a WorkflowProvider');
  }
  return context;
};

interface WorkflowProviderProps {
  children: React.ReactNode;
  onBrainClick: (nodeId: string, description: string) => void;
  onBrainAccept: (nodeId: string, suggestions: any[]) => void;
  nodes: any[];
  edges: any[];
}

export const WorkflowProvider: React.FC<WorkflowProviderProps> = ({
  children,
  onBrainClick,
  onBrainAccept,
  nodes,
  edges
}) => {
  return (
    <WorkflowContext.Provider value={{ onBrainClick, onBrainAccept, nodes, edges }}>
      {children}
    </WorkflowContext.Provider>
  );
};
