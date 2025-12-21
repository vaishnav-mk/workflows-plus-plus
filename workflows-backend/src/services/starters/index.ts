import { WorkflowStarter } from "../../core/types";
import * as apiStarters from "./starters/api";
import * as dataStarters from "./starters/data";
import * as logicStarters from "./starters/logic";
import * as databaseStarters from "./starters/database";
import * as validationStarters from "./starters/validation";
import * as aiStarters from "./starters/ai";

export const WORKFLOW_STARTERS: WorkflowStarter[] = [
  apiStarters.simpleApiStarter,
  dataStarters.dataProcessingStarter,
  logicStarters.conditionalFlowStarter,
  databaseStarters.databaseQueryStarter,
  validationStarters.validationPipelineStarter,
  aiStarters.aiProcessingStarter
];

export function getWorkflowStarters(filter?: {
  category?: string;
  difficulty?: string;
  tags?: string[];
}): WorkflowStarter[] {
  let starters = [...WORKFLOW_STARTERS];
  
  if (filter?.category) {
    starters = starters.filter(s => s.category === filter.category);
  }
  
  if (filter?.difficulty) {
    starters = starters.filter(s => s.difficulty === filter.difficulty);
  }
  
  if (filter?.tags && filter.tags.length > 0) {
    starters = starters.filter(s => 
      filter.tags!.some(tag => s.tags.includes(tag))
    );
  }
  
  return starters;
}

export function getWorkflowStarterById(id: string): WorkflowStarter | undefined {
  return WORKFLOW_STARTERS.find(s => s.id === id);
}

export function getStarterCategories(): string[] {
  return [...new Set(WORKFLOW_STARTERS.map(s => s.category))];
}

export type { WorkflowStarter } from "../../core/types";
