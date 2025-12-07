import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";

const WaitEventConfigSchema = z.object({
  eventType: z.string(),
  timeout: z
    .object({
      value: z.number(),
      unit: z.enum(["seconds", "minutes", "hours", "days"])
    })
    .optional(),
  timeoutBehavior: z.enum(["error", "continue"]).default("error")
});

type WaitEventConfig = z.infer<typeof WaitEventConfigSchema>;

const TIME_MULTIPLIERS: Record<string, number> = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000
};

export const WaitEventNode: WorkflowNodeDefinition<WaitEventConfig> = {
  metadata: {
    type: NodeType.WAIT_EVENT,
    name: "Wait for Event",
    description:
      "Pause workflow until external event (human approval, webhook, etc.)",
    category: NodeCategory.TIMING,
    version: "1.0.0",
    icon: "Pause",
    color: "#F59E0B",
    tags: ["wait", "approval", "pause", "human"]
  },
  configSchema: WaitEventConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Start waiting",
      required: true
    }
  ],
  outputPorts: [
    {
      id: "event",
      label: "Event Data",
      type: DataType.OBJECT,
      description: "Received event",
      required: false
    },
    {
      id: "timedOut",
      label: "Timed Out",
      type: DataType.BOOLEAN,
      description: "Timeout occurred",
      required: false
    }
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: false,
    supportsRetry: false,
    isAsync: true,
    canFail: true
  },
  validation: {
    rules: [],
    errorMessages: {}
  },
  examples: [
    {
      name: "Wait for Approval",
      description: "Pause for manual approval",
      config: { eventType: "approval", timeout: { value: 24, unit: "hours" } }
    }
  ],
  codegen: ({
    config,
    stepName
  }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function*(_) {
      let timeoutCode = "";
      if (config.timeout) {
        const multiplier = TIME_MULTIPLIERS[config.timeout.unit] || 1000;
        const timeoutMs = config.timeout.value * multiplier;
        timeoutCode = `
      const timeoutId = setTimeout(() => {
        if ('${config.timeoutBehavior}' === 'error') {
          throw new Error('Wait event timed out');
        }
      }, ${timeoutMs});`;
      }

      const code = `
    _workflowResults.${stepName} = await step.waitFor('${stepName}', '${config.eventType}', async () => {
      ${timeoutCode}
      return { event: null, timedOut: false };
    });`;

      return {
        code,
        requiredBindings: []
      };
    });
  }
};
