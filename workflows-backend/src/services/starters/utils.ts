export function assignStandardizedNodeIds(nodes: any[]): any[] {
  const returnNodes = nodes.filter(n => n.type === 'return');
  const transformNodes = nodes.filter(n => n.type === 'transform');
  const lastReturnIndex = returnNodes.length > 0 ? nodes.indexOf(returnNodes[returnNodes.length - 1]) : nodes.length - 1;
  
  return nodes.map((node, index) => {
    let nodeId = node.id;
    if (!nodeId || !nodeId.startsWith('step_')) {
      if (node.type === 'entry') {
        nodeId = 'step_entry_0';
      } else if (node.type === 'return' && index === lastReturnIndex) {
        nodeId = `step_return_${lastReturnIndex}`;
      } else if (node.type === 'transform') {
        const transformIndex = transformNodes.indexOf(node);
        nodeId = `step_transform_${transformIndex}`;
      } else {
        const sanitizedType = node.type.replace(/[^a-z0-9]/g, '_');
        nodeId = `step_${sanitizedType}_${index}`;
      }
    }
    return { ...node, id: nodeId };
  });
}
