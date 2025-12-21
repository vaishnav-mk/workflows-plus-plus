import type { TemplateSegment, TemplateSuggestion } from "@/types/template";

export function parseTemplateValue(val: string): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  const templateRegex = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = templateRegex.exec(val)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: val.substring(lastIndex, match.index),
        start: lastIndex,
        end: match.index
      });
    }

    segments.push({
      type: "template",
      content: match[0],
      start: match.index,
      end: match.index + match[0].length
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < val.length) {
    segments.push({
      type: "text",
      content: val.substring(lastIndex),
      start: lastIndex,
      end: val.length
    });
  }

  return segments;
}

export function resolveNodeName(
  nodeId: string,
  availableNodes: Array<{ id: string; data?: { label?: string }; type?: string }>
): string {
  const node = availableNodes.find((n) => n.id === nodeId);
  if (node) {
    const label: string | null =
      typeof node.data?.label === "string" && node.data.label.length > 0
        ? node.data.label
        : null;
    const type: string | null =
      typeof node.type === "string" && node.type.length > 0 ? node.type : null;
    return label || type || nodeId;
  }
  return nodeId;
}

export function generateTemplateSuggestions(
  input: string,
  cursorPos: number,
  availableNodes: Array<{ id: string; data?: { label?: string; type?: string }; type?: string }>,
  getCachedNodeDef: (nodeType: string) => Promise<any>,
  resolveNodeName: (nodeId: string) => string
): Promise<TemplateSuggestion[]> {
  const beforeCursor = input.substring(0, cursorPos);
  const lastOpen = beforeCursor.lastIndexOf("{{");
  const lastClose = beforeCursor.lastIndexOf("}}");

  if (lastOpen === -1 || (lastClose !== -1 && lastClose > lastOpen)) {
    return Promise.resolve([]);
  }

  const afterOpen = beforeCursor.substring(lastOpen + 2);
  const suggestionsList: TemplateSuggestion[] = [];

  const isStateFormat = afterOpen.trim().startsWith("state.");
  const pathWithoutState = isStateFormat
    ? afterOpen.substring(6).trim()
    : afterOpen.trim();
  const pathParts = pathWithoutState ? pathWithoutState.split(".") : [];

  if (
    pathParts.length === 0 ||
    pathParts.length === 1 ||
    (pathParts.length === 2 && pathParts[1].trim() === "")
  ) {
    const nodePrefix = pathParts.length > 0 ? pathParts[0].trim().toLowerCase() : "";
    availableNodes.forEach((node) => {
      const nodeId = node.id;
      const nodeLabelStr =
        typeof node.data?.label === "string"
          ? node.data.label
          : typeof node.type === "string"
            ? node.type
            : nodeId;
      if (
        !nodePrefix ||
        nodeId.toLowerCase().startsWith(nodePrefix) ||
        nodeLabelStr.toLowerCase().includes(nodePrefix)
      ) {
        const nodeName = resolveNodeName(nodeId);
        suggestionsList.push({
          value: `{{state.${nodeId}.output}}`,
          display: `state.${nodeName}.output`
        });
      }
    });
  } else if (pathParts.length === 2) {
    const nodeId = pathParts[0].trim();
    const propPrefix = pathParts[1].trim().toLowerCase();
    const node = availableNodes.find((n) => n.id === nodeId);

    if (node) {
      const nodeName = resolveNodeName(nodeId);
      const nodeTypeStr =
        typeof node.data?.type === "string" ? node.data.type : "";
      return getCachedNodeDef(nodeTypeStr).then((nodeDef) => {
        const commonProps = ["output", "input"];
        commonProps.forEach((prop) => {
          if (prop.toLowerCase().startsWith(propPrefix)) {
            suggestionsList.push({
              value: `{{state.${nodeId}.${prop}}}`,
              display: `state.${nodeName}.${prop}`
            });
          }
        });

        const hasTrailingDot =
          pathParts.length > 2 && pathParts[pathParts.length - 1] === "";
        const isOutputPrefix =
          propPrefix === "output" ||
          propPrefix === "" ||
          propPrefix.startsWith("output");
        if (isOutputPrefix || hasTrailingDot) {
          if (nodeDef?.outputPorts) {
            nodeDef.outputPorts.forEach(
              (port: { id: string; label: string; type?: string }) => {
                suggestionsList.push({
                  value: `{{state.${nodeId}.output.${port.id}}}`,
                  display: `state.${nodeName}.output.${port.id} (${port.label})`
                });
              }
            );
          }

          const presetOutput = (nodeDef as any)?.presetOutput;
          if (presetOutput && typeof presetOutput === "object") {
            Object.keys(presetOutput).forEach((key) => {
              suggestionsList.push({
                value: `{{state.${nodeId}.output.${key}}}`,
                display: `state.${nodeName}.output.${key}`
              });
            });
          }
        } else {
          if (nodeDef?.outputPorts) {
            nodeDef.outputPorts.forEach(
              (port: { id: string; label: string; type?: string }) => {
                if (port.id.toLowerCase().startsWith(propPrefix)) {
                  suggestionsList.push({
                    value: `{{state.${nodeId}.output.${port.id}}}`,
                    display: `state.${nodeName}.output.${port.id} (${port.label})`
                  });
                }
              }
            );
          }
        }
        return suggestionsList.slice(0, 15);
      });
    }
  } else if (pathParts.length === 3) {
    const nodeId = pathParts[0].trim();
    const node = availableNodes.find((n) => n.id === nodeId);

    if (node && pathParts[1].trim() === "output") {
      const propPrefix = pathParts[2] ? pathParts[2].trim().toLowerCase() : "";
      const nodeName = resolveNodeName(nodeId);
      const nodeTypeStr =
        typeof node.data?.type === "string" ? node.data.type : "";
      return getCachedNodeDef(nodeTypeStr).then((nodeDef) => {
        if (nodeDef?.outputPorts) {
          nodeDef.outputPorts.forEach(
            (port: {
              id: string;
              label: string;
              type: string;
              description: string;
            }) => {
              if (!propPrefix || port.id.toLowerCase().startsWith(propPrefix)) {
                suggestionsList.push({
                  value: `{{state.${nodeId}.output.${port.id}}}`,
                  display: `state.${nodeName}.output.${port.id} (${port.label})`
                });
              }
            }
          );
        }

        const presetOutput = (nodeDef as any)?.presetOutput;
        if (presetOutput && typeof presetOutput === "object") {
          Object.keys(presetOutput).forEach((key) => {
            if (!propPrefix || key.toLowerCase().startsWith(propPrefix)) {
              suggestionsList.push({
                value: `{{state.${nodeId}.output.${key}}}`,
                display: `state.${nodeName}.output.${key}`
              });
            }
          });
        }
        return suggestionsList.slice(0, 15);
      });
    }
  } else if (pathParts.length >= 4) {
    const nodeId = pathParts[0].trim();
    const node = availableNodes.find((n) => n.id === nodeId);

    if (node && pathParts[1].trim() === "output") {
      const parentProp = pathParts[2].trim();
      const propPrefix = pathParts[3].trim().toLowerCase();
      const nodeName = resolveNodeName(nodeId);
      const nodeTypeStr =
        typeof node.data?.type === "string" ? node.data.type : "";
      return getCachedNodeDef(nodeTypeStr).then((nodeDef) => {
        const presetOutput = (nodeDef as any)?.presetOutput;
        if (
          presetOutput &&
          presetOutput[parentProp] &&
          typeof presetOutput[parentProp] === "object"
        ) {
          Object.keys(presetOutput[parentProp]).forEach((key) => {
            if (key.toLowerCase().startsWith(propPrefix)) {
              suggestionsList.push({
                value: `{{state.${nodeId}.output.${parentProp}.${key}}}`,
                display: `state.${nodeName}.output.${parentProp}.${key}`
              });
            }
          });
        }
        return suggestionsList.slice(0, 15);
      });
    }
  }

  return Promise.resolve(suggestionsList.slice(0, 15));
}

