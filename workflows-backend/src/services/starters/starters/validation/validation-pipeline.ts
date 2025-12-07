import { WorkflowStarter } from "../../../../core/types";
import { assignStandardizedNodeIds } from "../../utils";

export const validationPipelineStarter: WorkflowStarter = {
  id: "validation-pipeline",
  name: "Data Validation Pipeline",
  description: "Validate incoming data against a schema",
  category: "Validation",
  icon: "CheckCircle",
  difficulty: "intermediate",
  tags: ["validation", "schema", "data"],
  workflow: (() => {
    const nodes = assignStandardizedNodeIds([
      {
        type: "entry",
        position: { x: 250, y: 50 }
      },
      {
        type: "validate",
        position: { x: 250, y: 180 },
        config: {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string", format: "email" },
              age: { type: "number", minimum: 0 }
            },
            required: ["name", "email"]
          }
        }
      },
      {
        type: "kv-put",
        position: { x: 250, y: 310 },
        config: {
          key: "validated-{{input.id}}",
          value: "{{step_validate_1.output}}"
        }
      },
      {
        type: "return",
        position: { x: 250, y: 440 }
      }
    ]);
    return {
      nodes,
      edges: [
        { source: nodes[0].id, target: nodes[1].id },
        { source: nodes[1].id, target: nodes[2].id },
        { source: nodes[2].id, target: nodes[3].id }
      ]
    };
  })()
};
