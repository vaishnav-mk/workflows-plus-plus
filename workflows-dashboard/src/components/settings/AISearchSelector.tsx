"use client";

import React from "react";
import { ResourceSelector } from "./ResourceSelector";
import { createAISearchConfig } from "@/config/resource-selectors";

interface AISearchSelectorProps {
  nodeData: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  nodeId: string;
}

export function AISearchSelector({
  nodeData,
  onNodeUpdate,
  nodeId
}: AISearchSelectorProps) {
  const config = createAISearchConfig();

  return (
    <div className="space-y-4">
      <ResourceSelector 
        nodeData={nodeData} 
        onNodeUpdate={onNodeUpdate} 
        nodeId={nodeId} 
        config={config} 
      />
    </div>
  );
}
