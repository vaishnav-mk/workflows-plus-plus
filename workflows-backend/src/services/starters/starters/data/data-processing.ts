import { WorkflowStarter } from "../../../../core/types";
import { assignStandardizedNodeIds } from "../../utils";

export const dataProcessingStarter: WorkflowStarter = {
  id: 'data-processing',
  name: 'Data Processing Pipeline',
  description: 'Fetch data from an API, transform it, and store in KV',
  category: 'Data',
  icon: 'Database',
  difficulty: 'intermediate',
  tags: ['http', 'transform', 'storage', 'kv'],
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
        type: 'transform',
        position: { x: 250, y: 280 },
        config: {
          code: 'return { processed: input.data, timestamp: Date.now() }'
        }
      },
      {
        type: 'kv-put',
        position: { x: 250, y: 410 },
        config: {
          key: 'processed-data',
          value: '{{step_transform_0.output}}'
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
        { source: nodes[2].id, target: nodes[3].id },
        { source: nodes[3].id, target: nodes[4].id }
      ]
    };
  })()
};
