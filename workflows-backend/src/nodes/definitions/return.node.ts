import { z } from 'zod';

const ReturnConfigSchema = z.object({
  returnValue: z.object({
    type: z.enum(['expression', 'variable', 'static']),
    value: z.any(),
  }).optional(),
});

export const ReturnNode = {
  metadata: {
    type: 'return',
    name: 'Return',
    description: 'Workflow exit point - returns final result',
    category: 'control' as const,
    version: '1.0.0',
    icon: 'CheckCircle',
    color: '#EF4444',
    tags: ['end', 'finish', 'return', 'exit'],
  },
  configSchema: ReturnConfigSchema,
  inputPorts: [
    {
      id: 'trigger',
      label: 'Execute',
      type: 'any' as const,
      description: 'Data to return',
      required: true,
    },
  ],
  outputPorts: [],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: false,
    isAsync: false,
    canFail: false,
  },
  validation: {
    rules: [],
    errorMessages: {},
  },
  examples: [
    {
      name: 'Return Success',
      description: 'Return a success message',
      config: {
        returnValue: { type: 'static', value: { success: true, message: 'Workflow completed' } },
      },
    },
    {
      name: 'Return Input',
      description: 'Return the input data',
      config: {
        returnValue: { type: 'expression', value: 'data' },
      },
    },
  ],
};

