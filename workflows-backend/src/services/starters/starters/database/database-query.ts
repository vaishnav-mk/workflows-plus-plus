import { WorkflowStarter } from "../../../../core/types";
import { assignStandardizedNodeIds } from "../../utils";

export const databaseQueryStarter: WorkflowStarter = {
  id: 'database-query',
  name: 'Database Query Workflow',
  description: 'Query D1 database and return results',
  category: 'Database',
  icon: 'Database',
  difficulty: 'beginner',
  tags: ['d1', 'database', 'sql'],
  workflow: (() => {
    const nodes = assignStandardizedNodeIds([
      {
        type: 'entry',
        position: { x: 250, y: 100 }
      },
      {
        type: 'd1-query',
        position: { x: 250, y: 250 },
        config: {
          query: 'SELECT * FROM users WHERE active = 1',
          database: 'MY_DB'
        }
      },
      {
        type: 'return',
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
