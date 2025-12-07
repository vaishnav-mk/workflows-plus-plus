import { WorkflowStarter } from "../../../../core/types";
import { assignStandardizedNodeIds } from "../../utils";

export const simpleApiStarter: WorkflowStarter = {
  id: "simple-api",
  name: "Simple API Workflow",
  description:
    "Basic workflow that makes an HTTP request and returns the response",
  category: "API",
  icon: "Globe",
  difficulty: "beginner",
  tags: ["http", "api", "basic"],
  workflow: (() => {
    const nodes = assignStandardizedNodeIds([
      {
        id: "step_entry_0",
        type: "entry",
        position: { x: 250, y: 100 }
      },
      {
        id: "step_http_request_1",
        type: "http-request",
        position: { x: 250, y: 250 },
        config: {
          url: "https://api.jolpi.ca/ergast/f1/current/driverStandings.json",
          method: "GET"
        }
      },
      {
        id: "step_return_2",
        type: "return",
        position: { x: 250, y: 400 }
      }
    ]);
    return {
      nodes,
      edges: [
        { source: nodes[0].id, target: nodes[1].id },
        { source: nodes[1].id, target: nodes[2].id }
      ]
    };
  })()
};
