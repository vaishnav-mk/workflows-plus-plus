/**
 * Entry Node - Workflow entry point
 */

import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";

const EntryConfigSchema = z.object({
  params: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    required: z.boolean().default(false),
    defaultValue: z.any().optional(),
  })).default([]),
});

type EntryConfig = z.infer<typeof EntryConfigSchema>;

export const EntryNode: WorkflowNodeDefinition<EntryConfig> = {
  metadata: {
    type: NodeType.ENTRY,
    name: "Entry",
    description: "Workflow entry point - receives input and starts execution",
    category: NodeCategory.CONTROL,
    version: "1.0.0",
    icon: "Play",
    color: "#10B981",
    tags: ["start", "begin", "entry"],
  },
  configSchema: EntryConfigSchema,
  inputPorts: [],
  outputPorts: [
    {
      id: "event",
      label: "Event",
      type: DataType.OBJECT,
      description: "Workflow event with payload and metadata",
      required: false,
    },
    {
      id: "payload",
      label: "Payload",
      type: DataType.OBJECT,
      description: "User-provided parameters",
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
    errorMessages: {},
  },
  examples: [
    {
      name: "Basic Entry",
      description: "Simple entry point with no parameters",
      config: { params: [] },
    },
    {
      name: "With Parameters",
      description: "Entry point expecting user name and age",
      config: {
        params: [
          { name: "name", type: "string", required: true },
          { name: "age", type: "number", required: false, defaultValue: 18 },
        ],
      },
    },
  ],
  presetOutput: {
    name: "John",
    age: 30
  },
  codegen: ({ nodeId, config }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const params = config.params || [];
      const paramNames = params.map(p => p.name).filter(Boolean);
      
      let code: string;
      if (paramNames.length > 0) {
        const paramList = paramNames.join(", ");
        code = `
    // Workflow entry point
    const { ${paramList} } = event.payload || {};
    _workflowState['${nodeId}'] = {
      input: event.payload,
      output: { ${paramList} }
    };`;
      } else {
        code = `
    // Workflow entry point
    _workflowState['${nodeId}'] = {
      input: event.payload,
      output: event.payload
    };`;
      }

      return {
        code,
        requiredBindings: [],
      };
    });
  },
};

