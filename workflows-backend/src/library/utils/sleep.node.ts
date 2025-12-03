/**
 * Sleep Node - Pause workflow execution
 */

import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";
import { DEFAULT_VALUES } from "../../core/constants";

const SleepConfigSchema = z.object({
  duration: z.union([
    z.number().min(0),
    z.object({
      type: z.literal("relative"),
      value: z.number().min(0),
      unit: z.enum(["ms", "seconds", "minutes", "hours", "days"]),
    }),
  ]).default(1000),
});

type SleepConfig = z.infer<typeof SleepConfigSchema>;

const DURATION_MULTIPLIERS: Record<string, number> = {
  ms: 1,
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
};

export const SleepNode: WorkflowNodeDefinition<SleepConfig> = {
  metadata: {
    type: NodeType.SLEEP,
    name: "Sleep",
    description: "Pause workflow execution for a specified duration",
    category: NodeCategory.TIMING,
    version: "1.0.0",
    icon: "Clock",
    color: "#F59E0B",
    tags: ["pause", "delay", "wait"],
  },
  configSchema: SleepConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Start sleep",
      required: true,
    },
  ],
  outputPorts: [
    {
      id: "completed",
      label: "Completed",
      type: DataType.ANY,
      description: "Sleep completed",
      required: false,
    },
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
      name: "Sleep 1 Second",
      description: "Wait for 1 second",
      config: { duration: 1000 },
    },
    {
      name: "Sleep 5 Minutes",
      description: "Wait for 5 minutes",
      config: { duration: { type: "relative", value: 5, unit: "minutes" } },
    },
  ],
  codegen: ({ config, stepName }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      let durationMs: number;
      
      if (typeof config.duration === "number") {
        durationMs = config.duration;
      } else if (config.duration.type === "relative") {
        const multiplier = DURATION_MULTIPLIERS[config.duration.unit] || 1000;
        durationMs = config.duration.value * multiplier;
      } else {
        durationMs = DEFAULT_VALUES.TIMEOUT;
      }

      const code = `
    await step.sleep('${stepName}', ${durationMs});`;

      return {
        code,
        requiredBindings: [],
      };
    });
  },
};

