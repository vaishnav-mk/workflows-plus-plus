import { z } from "zod";
import { Effect } from "effect";
import { WorkflowNodeDefinition, CodeGenResult } from "../../core/types";
import { NodeType, NodeCategory, DataType, ErrorCode } from "../../core/enums";

const ParallelConfigSchema = z.object({
  branches: z.array(z.object({
    name: z.string().min(1, "Branch name is required"),
    description: z.string().optional()
  })).min(1, "At least one branch is required").max(10, "Maximum 10 branches allowed")
});

type ParallelConfig = z.infer<typeof ParallelConfigSchema>;

export const ParallelNode: WorkflowNodeDefinition<ParallelConfig> = {
  metadata: {
    type: NodeType.PARALLEL,
    name: "Parallel",
    description: "Split execution into multiple parallel branches",
    category: NodeCategory.CONTROL,
    version: "1.0.0",
    icon: "GitBranch",
    color: "#3B82F6",
    tags: ["parallel", "fork", "split", "concurrent"]
  },
  configSchema: ParallelConfigSchema,
  inputPorts: [
    {
      id: "trigger",
      label: "Execute",
      type: DataType.ANY,
      description: "Input data to distribute to all branches",
      required: true
    }
  ],
  outputPorts: [
    {
      id: "branch1",
      label: "Branch 1",
      type: DataType.ANY,
      description: "First parallel branch",
      required: false
    },
    {
      id: "branch2",
      label: "Branch 2",
      type: DataType.ANY,
      description: "Second parallel branch",
      required: false
    },
    {
      id: "branch3",
      label: "Branch 3",
      type: DataType.ANY,
      description: "Third parallel branch",
      required: false
    },
    {
      id: "branch4",
      label: "Branch 4",
      type: DataType.ANY,
      description: "Fourth parallel branch",
      required: false
    },
    {
      id: "branch5",
      label: "Branch 5",
      type: DataType.ANY,
      description: "Fifth parallel branch",
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
      name: "Two Parallel Branches",
      description: "Split into two parallel execution paths",
      config: {
        branches: [
          { name: "Branch A", description: "Process user data" },
          { name: "Branch B", description: "Send notifications" }
        ]
      }
    },
    {
      name: "Three Parallel Tasks",
      description: "Execute three independent tasks in parallel",
      config: {
        branches: [
          { name: "Fetch Data", description: "Get data from API" },
          { name: "Process Cache", description: "Update cache" },
          { name: "Log Activity", description: "Record activity" }
        ]
      }
    }
  ],
  codegen: ({
    nodeId,
    config,
    stepName
  }): Effect.Effect<CodeGenResult, { _tag: ErrorCode; message: string }> => {
    return Effect.gen(function* (_) {
      const branches = config.branches || [];
      const branchNames = branches.map((_, i) => `branch${i + 1}`).slice(0, 5);
      
      const code = `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = _workflowState['${nodeId}']?.input || {};
      
      const parallelResults = {
        ${branchNames.map((name) => `'${name}': inputData`).join(",\n        ")}
      };
      
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: parallelResults
      };
      
      return parallelResults;
    });`;

      return {
        code,
        requiredBindings: []
      };
    });
  }
};

