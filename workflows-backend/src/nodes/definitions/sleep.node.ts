import { z } from 'zod';

const SleepConfigSchema = z.object({
  duration: z.union([
    z.number(),
    z.object({
      type: z.enum(['relative']),
      value: z.number(),
      unit: z.enum(['ms', 'seconds', 'minutes', 'hours', 'days']),
    }),
  ]),
});

export const SleepNode = {
  metadata: {
    type: 'sleep',
    name: 'Sleep',
    description: 'Pause workflow execution for a specified duration',
    category: 'timing' as const,
    version: '1.0.0',
    icon: 'Clock',
    color: '#F59E0B',
    tags: ['pause', 'delay', 'wait'],
  },
  configSchema: SleepConfigSchema,
  inputPorts: [
    { id: 'trigger', label: 'Execute', type: 'any' as const, description: 'Start sleep', required: true },
  ],
  outputPorts: [
    { id: 'completed', label: 'Completed', type: 'any' as const, description: 'Sleep completed', required: false },
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: false,
    isAsync: true,
    canFail: false,
  },
  validation: {
    rules: [],
    errorMessages: {},
  },
  examples: [
    {
      name: 'Sleep 1 Second',
      description: 'Wait for 1 second',
      config: { duration: 1000 },
    },
    {
      name: 'Sleep 5 Minutes',
      description: 'Wait for 5 minutes',
      config: { duration: { type: 'relative', value: 5, unit: 'minutes' } },
    },
  ],
};

