const WORDS = [
  "sacred",
  "tick",
  "satisfied",
  "ghost",
  "beneficiary",
  "bed",
  "ancient",
  "river",
  "crystal",
  "forest",
  "mountain",
  "ocean",
  "dragon",
  "phoenix",
  "eagle",
  "wolf",
  "tiger",
  "lion",
  "star",
  "moon",
  "sun",
  "cloud",
  "storm",
  "rain",
  "fire",
  "water",
  "earth",
  "wind",
  "light",
  "dark",
  "sword",
  "shield",
  "crown",
  "gem",
  "pearl",
  "diamond",
  "journey",
  "quest",
  "adventure",
  "treasure",
  "map",
  "compass",
  "temple",
  "castle",
  "tower",
  "bridge",
  "gate",
  "door",
  "wisdom",
  "power",
  "magic",
  "spirit",
  "soul",
  "heart",
  "brave",
  "noble",
  "wise",
  "swift",
  "strong",
  "bright"
];

export function generateWorkflowId(): string {
  const word1 = WORDS[Math.floor(Math.random() * WORDS.length)];
  const word2 = WORDS[Math.floor(Math.random() * WORDS.length)];
  const word3 = WORDS[Math.floor(Math.random() * WORDS.length)];
  return `workflow-${word1}-${word2}-${word3}`;
}

export function generateNodeId(
  nodeType: string,
  index: number,
  isEntry: boolean,
  isReturn: boolean,
  totalNodes: number
): string {
  if (isEntry) {
    return "step_entry_0";
  }

  if (isReturn) {
    return `step_return_${totalNodes - 1}`;
  }

  if (nodeType === "transform") {
    return `step_transform_${index}`;
  }

  const sanitizedType = nodeType.replace(/[^a-z0-9]/g, "_");
  return `step_${sanitizedType}_${index}`;
}

export function generateClassName(workflowId: string): string {
  const withoutPrefix = workflowId.replace(/^workflow-/, "");
  const words = withoutPrefix.split("-");
  const capitalized = words.map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  );
  return capitalized.join("") + "Workflow";
}

export function generateBindingName(
  bindingType: string,
  workflowId: string
): string {
  const workflowIdSuffix = workflowId.replace(/^workflow-/, "");
  const bindingName = bindingType.toUpperCase();
  return `binding_${bindingName}_${workflowIdSuffix}`;
}

export function extractWorkflowIdFromBinding(
  bindingName: string
): string | null {
  const match = bindingName.match(/^binding_[A-Z0-9_]+_(.+)$/);
  return match ? match[1] : null;
}
