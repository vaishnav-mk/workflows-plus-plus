import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";

const JoinConfigSchema = z.object({
  joinStrategy: z.enum(["all", "first", "any"]).default("all"),
  timeout: z.number().positive().optional(),
  mergeStrategy: z.enum(["merge", "array", "object"]).default("merge")
});

type JoinConfig = z.infer<typeof JoinConfigSchema>;

export const JoinNode: WorkflowNodeDefinition<JoinConfig> = {
  metadata: {
    type: NodeType.JOIN,
    name: "Join",
    description: "Wait for and combine results from parallel branches",
    category: NodeCategory.CONTROL,
    version: "1.0.0",
    icon: "GitMerge",
    color: "#10B981",
    tags: ["join", "merge", "combine", "synchronize"]
  },
  configSchema: JoinConfigSchema,
  inputPorts: [
    {
      id: "branch1",
      label: "Branch 1",
      type: DataType.ANY,
      description: "First branch result",
      required: false
    },
    {
      id: "branch2",
      label: "Branch 2",
      type: DataType.ANY,
      description: "Second branch result",
      required: false
    },
    {
      id: "branch3",
      label: "Branch 3",
      type: DataType.ANY,
      description: "Third branch result",
      required: false
    },
    {
      id: "branch4",
      label: "Branch 4",
      type: DataType.ANY,
      description: "Fourth branch result",
      required: false
    },
    {
      id: "branch5",
      label: "Branch 5",
      type: DataType.ANY,
      description: "Fifth branch result",
      required: false
    }
  ],
  outputPorts: [
    {
      id: "result",
      label: "Result",
      type: DataType.OBJECT,
      description: "Combined results from all branches",
      required: false
    }
  ],
  bindings: [],
  capabilities: {
    playgroundCompatible: true,
    supportsRetry: false,
    isAsync: true,
    canFail: false
  },
  validation: {
    rules: [],
    errorMessages: {}
  },
  examples: [
    {
      name: "Join All Branches",
      description: "Wait for all branches to complete and merge results",
      config: {
        joinStrategy: "all",
        mergeStrategy: "merge"
      }
    },
    {
      name: "Join First Available",
      description: "Proceed when first branch completes",
      config: {
        joinStrategy: "first",
        mergeStrategy: "object"
      }
    },
    {
      name: "Join with Timeout",
      description: "Wait for branches with a timeout",
      config: {
        joinStrategy: "all",
        timeout: 5000,
        mergeStrategy: "merge"
      }
    }
  ],
  codegen: ({
    nodeId,
    config,
    stepName,
    graphContext
  }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const joinStrategy = config.joinStrategy || "all";
      const mergeStrategy = config.mergeStrategy || "merge";
      const timeout = config.timeout;
      
      const incomingEdges = graphContext.edges.filter(e => e.target === nodeId);
      const branchInputs = incomingEdges
        .map(e => {
          const sourceNodeId = e.source;
          const sanitizedStepName = sourceNodeId.replace(/[^a-zA-Z0-9_]/g, "_");
          return `_workflowResults.${sanitizedStepName}`;
        });
      
      let code: string;
      
      if (joinStrategy === "all") {
        if (timeout) {
          code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const branchResults = await Promise.all([
        ${branchInputs.join(",\n        ")}
      ]);
      
      let mergedResult;
      if (mergeStrategy === "merge") {
        mergedResult = Object.assign({}, ...branchResults);
      } else if (mergeStrategy === "array") {
        mergedResult = branchResults;
      } else {
        mergedResult = { branches: branchResults };
      }
      
      _workflowState['${nodeId}'] = {
        input: branchResults,
        output: mergedResult
      };
      
      return mergedResult;
    });`;
        } else {
          code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const branchResults = await Promise.all([
        ${branchInputs.length > 0 ? branchInputs.join(",\n        ") : "Promise.resolve({})"}
      ]);
      
      let mergedResult;
      if ("${mergeStrategy}" === "merge") {
        mergedResult = Object.assign({}, ...branchResults);
      } else if ("${mergeStrategy}" === "array") {
        mergedResult = branchResults;
      } else {
        mergedResult = { branches: branchResults };
      }
      
      _workflowState['${nodeId}'] = {
        input: branchResults,
        output: mergedResult
      };
      
      return mergedResult;
    });`;
        }
      } else if (joinStrategy === "first") {
        code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const firstResult = await Promise.race([
        ${branchInputs.length > 0 ? branchInputs.join(",\n        ") : "Promise.resolve({})"}
      ]);
      
      _workflowState['${nodeId}'] = {
        input: [firstResult],
        output: firstResult
      };
      
      return firstResult;
    });`;
      } else {
        code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const branchResults = await Promise.allSettled([
        ${branchInputs.length > 0 ? branchInputs.join(",\n        ") : "Promise.resolve({})"}
      ]);
      
      const successfulResults = branchResults
        .filter(r => r.status === "fulfilled")
        .map(r => r.status === "fulfilled" ? r.value : null);
      
      let mergedResult;
      if ("${mergeStrategy}" === "merge") {
        mergedResult = Object.assign({}, ...successfulResults);
      } else if ("${mergeStrategy}" === "array") {
        mergedResult = successfulResults;
      } else {
        mergedResult = { branches: successfulResults };
      }
      
      _workflowState['${nodeId}'] = {
        input: branchResults,
        output: mergedResult
      };
      
      return mergedResult;
    });`;
      }

      return {
        code,
        requiredBindings: []
      };
    });
  }
};

