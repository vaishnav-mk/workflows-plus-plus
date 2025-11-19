import { z } from 'zod';

const TransformConfigSchema = z.object({
  code: z.string().default('return data;'),
});

export const TransformNode = {
  metadata: {
    type: 'transform',
    name: 'Transform',
    description: 'Execute JavaScript to transform data',
    category: 'transform' as const,
    version: '1.0.0',
    icon: 'Code',
    color: '#8B5CF6',
    tags: ['javascript', 'data', 'transform'],
  },
  configSchema: TransformConfigSchema,
  inputPorts: [
    { id: 'trigger', label: 'Execute', type: 'any' as const, description: 'Input data', required: true },
  ],
  outputPorts: [
    { id: 'result', label: 'Result', type: 'any' as const, description: 'Transformed data', required: false },
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: false,
    isAsync: false,
    canFail: true,
  },
  validation: {
    rules: [],
    errorMessages: {},
  },
  examples: [
    {
      name: 'Double Value',
      description: 'Multiply input by 2',
      config: { code: 'return { value: data.value * 2 };' },
    },
    {
      name: 'Format User',
      description: 'Format user data',
      config: { code: 'return { fullName: data.firstName + " " + data.lastName };' },
    },
  ],
  presetOutput: {
    result: { transformed: true, data: {} },
    message: 'Data transformation completed successfully'
  },
};

