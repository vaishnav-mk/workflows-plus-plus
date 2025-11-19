import { z } from 'zod';

const HttpRequestConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  headers: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
  body: z.object({
    type: z.enum(['none', 'json', 'text', 'form']),
    content: z.any(),
  }).default({ type: 'none', content: '' }),
  timeout: z.number().min(1000).max(300000).default(30000),
});

export const HttpRequestNode = {
  metadata: {
    type: 'http-request',
    name: 'HTTP Request',
    description: 'Make external API calls',
    category: 'http' as const,
    version: '1.0.0',
    icon: 'Globe',
    color: '#3B82F6',
    tags: ['api', 'rest', 'http'],
  },
  configSchema: HttpRequestConfigSchema,
  inputPorts: [
    { id: 'trigger', label: 'Execute', type: 'any' as const, description: 'Trigger request', required: true },
  ],
  outputPorts: [
    { id: 'response', label: 'Response', type: 'object' as const, description: 'HTTP response', required: false },
    { id: 'body', label: 'Body', type: 'any' as const, description: 'Response body', required: false },
    { id: 'status', label: 'Status', type: 'number' as const, description: 'Status code', required: false },
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: true,
    isAsync: true,
    canFail: true,
  },
  validation: { 
    rules: [], 
    errorMessages: {} 
  },
  examples: [
    {
      name: 'GET Request',
      description: 'Fetch data from API',
      config: { url: 'https://api.example.com/users', method: 'GET', headers: [] },
    },
    {
      name: 'POST with JSON',
      description: 'Create a resource',
      config: {
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: { type: 'json', content: { name: 'John' } },
      },
    },
  ],
  presetOutput: {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: { id: 1, name: 'Example', data: {} },
    message: 'HTTP request completed successfully'
  },
};

