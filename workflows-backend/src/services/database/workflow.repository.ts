/**
 * Workflow Repository
 * Database operations for workflows
 */

import { D1Database } from "@cloudflare/workers-types";
import { WorkflowRecord, CreateWorkflowData, UpdateWorkflowData } from "./types";
import { WorkflowStatus } from "../../core/enums";
import { logger } from "../../core/logging/logger";
import { DEFAULT_VALUES } from "../../core/constants";

export class WorkflowRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateWorkflowData): Promise<WorkflowRecord> {
    const startTime = Date.now();
    logger.info("Creating workflow in database", { workflowId: data.id, name: data.name });

    try {
      const now = new Date().toISOString();
      const workflow: WorkflowRecord = {
        id: data.id,
        name: data.name,
        description: data.description || DEFAULT_VALUES.DEFAULT_DESCRIPTION,
        nodes: JSON.stringify(data.nodes),
        edges: JSON.stringify(data.edges),
        createdAt: now,
        updatedAt: now,
        version: data.version || 1,
        status: data.status || WorkflowStatus.DRAFT
      };

      await this.db
        .prepare(
          `INSERT INTO workflows (id, name, description, nodes, edges, createdAt, updatedAt, version, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          workflow.id,
          workflow.name,
          workflow.description,
          workflow.nodes,
          workflow.edges,
          workflow.createdAt,
          workflow.updatedAt,
          workflow.version,
          workflow.status
        )
        .run();

      const duration = Date.now() - startTime;
      logger.logPerformance("db_create_workflow", duration, { workflowId: workflow.id });

      return workflow;
    } catch (error) {
      logger.error("Failed to create workflow", error instanceof Error ? error : new Error(String(error)), {
        workflowId: data.id
      });
      throw error;
    }
  }

  async getById(id: string): Promise<WorkflowRecord | null> {
    logger.debug("Fetching workflow from database", { workflowId: id });

    try {
      const result = await this.db
        .prepare("SELECT * FROM workflows WHERE id = ?")
        .bind(id)
        .first<WorkflowRecord>();

      if (!result) {
        logger.debug("Workflow not found", { workflowId: id });
        return null;
      }

      return result;
    } catch (error) {
      logger.error("Failed to get workflow", error instanceof Error ? error : new Error(String(error)), {
        workflowId: id
      });
      throw error;
    }
  }

  async update(id: string, data: UpdateWorkflowData): Promise<WorkflowRecord> {
    const startTime = Date.now();
    logger.info("Updating workflow in database", { workflowId: id });

    try {
      const updatedAt = new Date().toISOString();
      const updates: string[] = [];
      const values: unknown[] = [];

      if (data.name !== undefined) {
        updates.push("name = ?");
        values.push(data.name);
      }
      if (data.description !== undefined) {
        updates.push("description = ?");
        values.push(data.description);
      }
      if (data.nodes !== undefined) {
        updates.push("nodes = ?");
        values.push(JSON.stringify(data.nodes));
      }
      if (data.edges !== undefined) {
        updates.push("edges = ?");
        values.push(JSON.stringify(data.edges));
      }
      if (data.version !== undefined) {
        updates.push("version = ?");
        values.push(data.version);
      }
      if (data.status !== undefined) {
        updates.push("status = ?");
        values.push(data.status);
      }

      updates.push("updatedAt = ?");
      values.push(updatedAt);
      values.push(id);

      await this.db
        .prepare(`UPDATE workflows SET ${updates.join(", ")} WHERE id = ?`)
        .bind(...values)
        .run();

      const duration = Date.now() - startTime;
      logger.logPerformance("db_update_workflow", duration, { workflowId: id });

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error("Failed to retrieve updated workflow");
      }

      return updated;
    } catch (error) {
      logger.error("Failed to update workflow", error instanceof Error ? error : new Error(String(error)), {
        workflowId: id
      });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    logger.info("Deleting workflow from database", { workflowId: id });

    try {
      await this.db.prepare("DELETE FROM workflows WHERE id = ?").bind(id).run();

      logger.info("Workflow deleted successfully", { workflowId: id });
    } catch (error) {
      logger.error("Failed to delete workflow", error instanceof Error ? error : new Error(String(error)), {
        workflowId: id
      });
      throw error;
    }
  }

  async list(limit = 100, offset = 0): Promise<WorkflowRecord[]> {
    logger.debug("Listing workflows from database", { limit, offset });

    try {
      const result = await this.db
        .prepare("SELECT * FROM workflows ORDER BY updatedAt DESC LIMIT ? OFFSET ?")
        .bind(limit, offset)
        .all<WorkflowRecord>();

      return result.results || [];
    } catch (error) {
      logger.error("Failed to list workflows", error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

