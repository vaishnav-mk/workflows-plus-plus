import {
  Workflow,
  CreateWorkflowRequest
} from "../types/workflow";
import { Env } from "../types/env";

export class WorkflowService {
  constructor(private env: Env) {}

  async getWorkflowById(id: string): Promise<Workflow | null> {
    try {
      const result = await this.env.DB
        .prepare("SELECT * FROM workflows WHERE id = ?")
        .bind(id)
        .first();

      if (!result) return null;
      return this.deserializeWorkflowRow(result as any);
    } catch (error) {
      throw new Error("Failed to fetch workflow");
    }
  }

  async createWorkflow(workflowData: CreateWorkflowRequest): Promise<Workflow> {
    const id = (globalThis as any).crypto.randomUUID();
    const now = new Date().toISOString();

    const workflow: Workflow = {
      id,
      name: workflowData.name || "Untitled Workflow",
      description: workflowData.description || "",
      nodes: workflowData.nodes || [],
      edges: workflowData.edges || [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      status: "draft"
    };

    try {
      await this.env.DB
        .prepare(
          `
        INSERT INTO workflows (id, name, description, nodes, edges, createdAt, updatedAt, version, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .bind(
          workflow.id,
          workflow.name,
          workflow.description,
          JSON.stringify(workflow.nodes),
          JSON.stringify(workflow.edges),
          workflow.createdAt,
          workflow.updatedAt,
          workflow.version,
          workflow.status
        )
        .run();

      return workflow;
    } catch (error) {
      throw new Error("Failed to create workflow");
    }
  }


  private deserializeWorkflowRow(row: any): Workflow {
    let nodes: any = [];
    let edges: any = [];
    try {
      nodes = typeof row.nodes === "string" ? JSON.parse(row.nodes) : (row.nodes || []);
    } catch {}
    try {
      edges = typeof row.edges === "string" ? JSON.parse(row.edges) : (row.edges || []);
    } catch {}

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      nodes,
      edges,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
      status: row.status
    } as Workflow;
  }
}
