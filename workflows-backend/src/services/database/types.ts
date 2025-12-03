/**
 * Database Repository Types
 */

import { WorkflowStatus } from "../../core/enums";

export interface WorkflowRecord {
  id: string;
  name: string;
  description: string;
  nodes: string; // JSON string
  edges: string; // JSON string
  createdAt: string;
  updatedAt: string;
  version: number;
  status: WorkflowStatus;
}

export interface CreateWorkflowData {
  id: string;
  name: string;
  description?: string;
  nodes: unknown[];
  edges: unknown[];
  version?: number;
  status?: WorkflowStatus;
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  nodes?: unknown[];
  edges?: unknown[];
  version?: number;
  status?: WorkflowStatus;
}

