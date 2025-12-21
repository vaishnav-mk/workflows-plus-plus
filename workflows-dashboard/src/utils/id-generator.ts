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
] as const;

export function generateWorkflowId(): string {
  const word1 = WORDS[Math.floor(Math.random() * WORDS.length)]!;
  const word2 = WORDS[Math.floor(Math.random() * WORDS.length)]!;
  const word3 = WORDS[Math.floor(Math.random() * WORDS.length)]!;
  return `workflow-${word1}-${word2}-${word3}`;
}

export function generateClassName(workflowId: string): string {
  const withoutPrefix = workflowId.replace(/^workflow-/, '');
  
  const words = withoutPrefix.split('-');
  const capitalized = words.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  );
  
  return capitalized.join('');
}

export function generateBindingName(
  bindingType: string,
  workflowId: string
): string {
  const workflowIdSuffix = workflowId.replace(/^workflow-/, '');
  const bindingName = bindingType.toUpperCase();
  return `binding_${bindingName}_${workflowIdSuffix}`;
}
