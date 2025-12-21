"use client";

import React from "react";
import { ResourceSelector } from "./ResourceSelector";
import { createKVNamespaceConfig } from "@/config/resource-selectors";

interface KVNamespaceSelectorProps {
  nodeData: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  nodeId: string;
}

export function KVNamespaceSelector({
  nodeData,
  onNodeUpdate,
  nodeId
}: KVNamespaceSelectorProps) {
  const config = createKVNamespaceConfig();
  return <ResourceSelector nodeData={nodeData} onNodeUpdate={onNodeUpdate} nodeId={nodeId} config={config} />;
}
