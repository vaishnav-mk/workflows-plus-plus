import { WorkflowStarter } from "../../../../core/types";
import { assignStandardizedNodeIds } from "../../utils";

export const aiProcessingStarter: WorkflowStarter = {
  id: "ai-processing",
  name: "AI Processing Workflow",
  description: "Process data through AI Gateway and return results",
  category: "AI",
  icon: "Brain",
  difficulty: "advanced",
  tags: ["ai", "llm", "processing"],
  workflow: (() => {
    const nodes = assignStandardizedNodeIds([
      {
        type: "entry",
        position: { x: 250, y: 50 }
      },
      {
        type: "workers-ai",
        position: { x: 250, y: 180 },
        config: {
          model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          prompt: "What is the capital of France?",
          gateway: "my-gateway"
        }
      },
      {
        type: "transform",
        position: { x: 250, y: 310 },
        config: {
          code:
            "return { result: input.completion, metadata: { timestamp: Date.now() } }"
        }
      },
      {
        type: "return",
        position: { x: 250, y: 440 }
      }
    ]);
    return {
      nodes,
      edges: [
        { source: nodes[0].id, target: nodes[1].id },
        { source: nodes[1].id, target: nodes[2].id },
        { source: nodes[2].id, target: nodes[3].id }
      ]
    };
  })()
};
