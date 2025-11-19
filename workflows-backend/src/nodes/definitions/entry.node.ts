import { z } from 'zod';

const EntryConfigSchema = z.object({
  params: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    required: z.boolean().default(false),
    defaultValue: z.any().optional(),
  })).default([]),
});

export const EntryNode = {
  metadata: {
    type: 'entry',
    name: 'Entry',
    description: 'Workflow entry point - receives input and starts execution',
    category: 'control' as const,
    version: '1.0.0',
    icon: 'Play',
    color: '#10B981',
    tags: ['start', 'begin', 'entry'],
  },
  configSchema: EntryConfigSchema,
  inputPorts: [],
  outputPorts: [
    { 
      id: 'event', 
      label: 'Event', 
      type: 'object' as const, 
      description: 'Workflow event with payload and metadata', 
      required: false,
    },
    { 
      id: 'payload', 
      label: 'Payload', 
      type: 'object' as const, 
      description: 'User-provided parameters', 
      required: false,
    },
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: false,
    isAsync: false,
    canFail: false,
  },
  validation: { 
    rules: [], 
    errorMessages: {} 
  },
  examples: [
    {
      name: 'Basic Entry',
      description: 'Simple entry point with no parameters',
      config: { params: [] },
    },
    {
      name: 'With Parameters',
      description: 'Entry point expecting user name and age',
      config: {
        params: [
          { name: 'name', type: 'string', required: true },
          { name: 'age', type: 'number', required: false, defaultValue: 18 },
        ],
      },
    },
  ],
  presetOutput: {
    name: "John",
    age: 30
  },
};

