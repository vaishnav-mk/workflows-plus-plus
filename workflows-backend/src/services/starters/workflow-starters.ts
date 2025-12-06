/**
 * Workflow Starters/Templates
 * Pre-built workflow templates that users can start from
 */

export interface WorkflowStarter {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  workflow: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      config?: Record<string, unknown>;
    }>;
    edges: Array<{
      source: string;
      target: string;
    }>;
  };
}

// Helper to generate standardized node IDs for starter workflows
function assignStandardizedNodeIds(nodes: any[]): any[] {
  const returnNodes = nodes.filter(n => n.type === 'return');
  const lastReturnIndex = returnNodes.length > 0 ? nodes.indexOf(returnNodes[returnNodes.length - 1]) : nodes.length - 1;
  
  return nodes.map((node, index) => {
    let nodeId = node.id;
    if (!nodeId || !nodeId.startsWith('step_')) {
      if (node.type === 'entry') {
        nodeId = 'step_entry_0';
      } else if (node.type === 'return' && index === lastReturnIndex) {
        nodeId = `step_return_${lastReturnIndex}`;
      } else {
        const sanitizedType = node.type.replace(/[^a-z0-9]/g, '_');
        nodeId = `step_${sanitizedType}_${index}`;
      }
    }
    return { ...node, id: nodeId };
  });
}

export const WORKFLOW_STARTERS: WorkflowStarter[] = [
  {
    id: 'simple-api',
    name: 'Simple API Workflow',
    description: 'Basic workflow that makes an HTTP request and returns the response',
    category: 'API',
    icon: 'Globe',
    difficulty: 'beginner',
    tags: ['http', 'api', 'basic'],
    workflow: (() => {
      const nodes = assignStandardizedNodeIds([
        {
          id: 'step_entry_0',
          type: 'entry',
          position: { x: 250, y: 100 }
        },
        {
          id: 'step_http_request_1',
          type: 'http-request',
          position: { x: 250, y: 250 },
          config: {
            url: 'https://api.jolpi.ca/ergast/f1/current/driverStandings.json',
            method: 'GET'
          }
        },
        {
          id: 'step_return_2',
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
  },
  {
    id: 'data-processing',
    name: 'Data Processing Pipeline',
    description: 'Fetch data from an API and store in KV',
    category: 'Data',
    icon: 'Database',
    difficulty: 'intermediate',
    tags: ['http', 'storage', 'kv'],
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
          type: 'kv_put',
          position: { x: 250, y: 280 },
          config: {
            key: 'processed-data',
            value: '{{step_http_request_1.output}}'
          }
        },
        {
          type: 'return',
          position: { x: 250, y: 410 }
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
  },
  {
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
          type: 'kv_put',
          position: { x: 100, y: 410 },
          config: {
            key: 'success-result',
            value: '{{step_http_request_1.output}}'
          }
        },
        {
          type: 'kv_put',
          position: { x: 400, y: 410 },
          config: {
            key: 'error-result',
            value: '{{step_http_request_1.output}}'
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
          // Conditional branches: success -> success kv, error (default) -> error kv
          { source: nodes[2].id, target: nodes[3].id, sourceHandle: "success" },
          { source: nodes[2].id, target: nodes[4].id, sourceHandle: "error" },
          { source: nodes[3].id, target: nodes[5].id },
          { source: nodes[4].id, target: nodes[5].id }
        ]
      };
    })()
  },
  {
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
  },
  {
    id: 'validation-pipeline',
    name: 'Data Validation Pipeline',
    description: 'Validate incoming data against a schema',
    category: 'Validation',
    icon: 'CheckCircle',
    difficulty: 'intermediate',
    tags: ['validation', 'schema', 'data'],
    workflow: (() => {
      const nodes = assignStandardizedNodeIds([
        {
          type: 'entry',
          position: { x: 250, y: 50 }
        },
        {
          type: 'validate',
          position: { x: 250, y: 180 },
          config: {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                age: { type: 'number', minimum: 0 }
              },
              required: ['name', 'email']
            }
          }
        },
        {
          type: 'kv_put',
          position: { x: 250, y: 310 },
          config: {
            key: 'validated-{{input.id}}',
            value: '{{step_validate_1.output}}'
          }
        },
        {
          type: 'return',
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
  },
  {
    id: 'ai-processing',
    name: 'AI Processing Workflow',
    description: 'Process data through AI Gateway and return results',
    category: 'AI',
    icon: 'Brain',
    difficulty: 'advanced',
    tags: ['ai', 'llm', 'processing'],
    workflow: (() => {
      const nodes = assignStandardizedNodeIds([
        {
          type: 'entry',
          position: { x: 250, y: 50 }
        },
        {
          type: 'workers-ai',
          position: { x: 250, y: 180 },
          config: {
            model: '@cf/meta/llama-3.1-8b-instruct-fast',
            prompt: 'What is the capital of France?',
            gateway: 'my-gateway'
          }
        },
        {
          type: 'return',
          position: { x: 250, y: 310 }
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
  },
  {
    id: 'browser-screenshot',
    name: 'Browser Screenshot',
    description: 'Take a screenshot of a webpage',
    category: 'Browser',
    icon: 'Monitor',
    difficulty: 'beginner',
    tags: ['browser', 'screenshot', 'render'],
    workflow: (() => {
      const nodes = assignStandardizedNodeIds([
        {
          type: 'entry',
          position: { x: 250, y: 100 }
        },
        {
          type: 'browser-render',
          position: { x: 250, y: 250 },
          config: {
            operation: 'screenshot',
            url: 'https://www.cloudflare.com',
            viewport: {
              width: 1920,
              height: 1080
            },
            screenshotOptions: {
              type: 'png',
              fullPage: false,
              encoding: 'base64'
            },
            waitForTimeout: 2000
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
  },
  {
    id: 'browser-extract-json',
    name: 'Browser JSON Extraction',
    description: 'Extract structured data from a webpage using AI',
    category: 'Browser',
    icon: 'FileSearch',
    difficulty: 'intermediate',
    tags: ['browser', 'extract', 'json', 'ai', 'scraping'],
    workflow: (() => {
      const nodes = assignStandardizedNodeIds([
        {
          type: 'entry',
          position: { x: 250, y: 100 }
        },
        {
          type: 'browser-extract',
          position: { x: 250, y: 250 },
          config: {
            operation: 'json',
            url: 'https://www.cloudflare.com',
            prompt: 'Extract the main title, description, and key features from the page',
            responseFormat: {
              type: 'json_schema',
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  features: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['title']
              }
            },
            scrollToBottom: true,
            waitForTimeout: 3000
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
  }
];

/**
 * Get all workflow starters
 */
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

/**
 * Get a specific workflow starter by ID
 */
export function getWorkflowStarterById(id: string): WorkflowStarter | undefined {
  return WORKFLOW_STARTERS.find(s => s.id === id);
}

/**
 * Get workflow starter categories
 */
export function getStarterCategories(): string[] {
  return [...new Set(WORKFLOW_STARTERS.map(s => s.category))];
}


