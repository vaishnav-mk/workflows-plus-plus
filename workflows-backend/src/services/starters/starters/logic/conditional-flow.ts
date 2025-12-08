import { WorkflowStarter } from "../../../../core/types";
import { assignStandardizedNodeIds } from "../../utils";

export const conditionalFlowStarter: WorkflowStarter = {
  id: 'conditional-flow',
  name: 'Conditional Workflow',
  description: 'Route workflow execution based on conditions',
  category: 'Logic',
  icon: 'GitBranch',
  difficulty: 'intermediate',
  tags: ['conditional', 'routing', 'logic'],
  workflow: (() => {
    const nodes = assignStandardizedNodeIds([
      {
        type: 'entry',
        position: { x: 250, y: 50 }
      },
      {
        type: 'http-request',
        position: { x: 250, y: 150 },
        config: {
          url: 'https://api.jolpi.ca/ergast/f1/current/driverStandings.json',
          method: 'GET'
        }
      },
      {
        type: 'conditional-router',
        position: { x: 250, y: 280 },
        config: {
          conditionPath: 'step_http_request_1.status',
          cases: [
            { case: "success", value: 200 },
            { case: "error", isDefault: true }
          ]
        }
      },
      {
        type: 'transform',
        position: { x: 100, y: 410 },
        config: {
          code: 'return { status: "success", data: input }'
        }
      },
      {
        type: 'transform',
        position: { x: 400, y: 410 },
        config: {
          code: 'return { status: "error", message: "Request failed" }'
        }
      },
      {
        type: 'return',
        position: { x: 250, y: 540 }
      }
    ]);
    return {
      nodes,
      edges: [
        { source: nodes[0].id, target: nodes[1].id },
        { source: nodes[1].id, target: nodes[2].id },
        { source: nodes[2].id, target: nodes[3].id, sourceHandle: "success" },
        { source: nodes[2].id, target: nodes[4].id, sourceHandle: "error" },
        { source: nodes[3].id, target: nodes[5].id },
        { source: nodes[4].id, target: nodes[5].id }
      ]
    };
  })()
};
