/**
 * ID Generator Utilities (Frontend)
 * Generates standardized IDs for workflows, nodes, and bindings
 */

// Common words for generating readable IDs
const WORDS = [
  'sacred', 'tick', 'satisfied', 'ghost', 'beneficiary', 'bed',
  'ancient', 'river', 'crystal', 'forest', 'mountain', 'ocean',
  'dragon', 'phoenix', 'eagle', 'wolf', 'tiger', 'lion',
  'star', 'moon', 'sun', 'cloud', 'storm', 'rain',
  'fire', 'water', 'earth', 'wind', 'light', 'dark',
  'sword', 'shield', 'crown', 'gem', 'pearl', 'diamond',
  'journey', 'quest', 'adventure', 'treasure', 'map', 'compass',
  'temple', 'castle', 'tower', 'bridge', 'gate', 'door',
  'wisdom', 'power', 'magic', 'spirit', 'soul', 'heart',
  'brave', 'noble', 'wise', 'swift', 'strong', 'bright'
];

/**
 * Generate a random word-based workflow ID
 * Format: workflow-{word1}-{word2}-{word3}
 * Example: workflow-sacred-tick-satisfied
 */
export function generateWorkflowId(): string {
  const word1 = WORDS[Math.floor(Math.random() * WORDS.length)];
  const word2 = WORDS[Math.floor(Math.random() * WORDS.length)];
  const word3 = WORDS[Math.floor(Math.random() * WORDS.length)];
  return `workflow-${word1}-${word2}-${word3}`;
}

/**
 * Generate class name from workflow ID
 * Example: workflow-ghost-beneficiary-bed -> WorkflowGhostBeneficiaryBed
 */
export function generateClassName(workflowId: string): string {
  // Remove 'workflow-' prefix
  const withoutPrefix = workflowId.replace(/^workflow-/, '');
  
  // Split by hyphens and capitalize each word
  const words = withoutPrefix.split('-');
  const capitalized = words.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  );
  
  return capitalized.join('');
}

/**
 * Generate binding name
 * Format: binding_{bindingName}_{workflowId}
 * Example: binding_KV_sacred-tick-satisfied
 */
export function generateBindingName(
  bindingType: string,
  workflowId: string
): string {
  // Remove 'workflow-' prefix from workflowId for binding name
  const workflowIdSuffix = workflowId.replace(/^workflow-/, '');
  const bindingName = bindingType.toUpperCase();
  return `binding_${bindingName}_${workflowIdSuffix}`;
}

