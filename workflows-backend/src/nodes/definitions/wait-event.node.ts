import { z } from "zod";

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

export const WaitEventNode = {
  metadata: {
    type: "wait-event",
    name: "Wait for Event",
    description: "Pause workflow until external event (human approval, webhook, etc.)",
    category: "timing" as const,
    version: "1.0.0",
    icon: "Pause",
    color: "#F59E0B",
    tags: ["wait", "approval", "pause", "human"]
  },
  configSchema: WaitEventConfigSchema,
  inputPorts: [
    { id: "trigger", label: "Execute", type: "any" as const, description: "Start waiting", required: true }
  ],
  outputPorts: [
    { id: "event", label: "Event Data", type: "object" as const, description: "Received event", required: false },
    { id: "timedOut", label: "Timed Out", type: "boolean" as const, description: "Timeout occurred", required: false }
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
  ]
};

