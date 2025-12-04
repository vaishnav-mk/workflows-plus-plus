'use client';

import { BaseEdge, EdgeProps, getSmoothStepPath } from 'reactflow';

interface ConditionalEdgeData {
  caseLabel?: string;
  caseValue?: any;
  isDefault?: boolean;
}

export function ConditionalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<ConditionalEdgeData>) {
  // Use smooth step path for straight/square edges
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0, // Make it completely straight/square
  });

  const caseLabel = data?.caseLabel || 'default';
  const isDefault = data?.isDefault || false;
  const caseValue = data?.caseValue;

  // Color based on case type
  const edgeColor = isDefault ? '#6b7280' : '#3b82f6';
  const labelBg = isDefault ? '#f3f4f6' : '#dbeafe';
  const labelTextColor = isDefault ? '#6b7280' : '#1e40af';

  // Build label text - show case name and value if available
  let labelTextContent = caseLabel;
  if (caseValue !== undefined && caseValue !== null && !isDefault) {
    // Format the value nicely
    const valueStr = typeof caseValue === 'string' ? caseValue : JSON.stringify(caseValue);
    labelTextContent = `${caseLabel}: ${valueStr}`;
  } else if (isDefault) {
    labelTextContent = `${caseLabel} (default)`;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: 2,
        }}
      />
      <g transform={`translate(${labelX}, ${labelY})`}>
        <rect
          x={-40}
          y={-10}
          width={80}
          height={20}
          rx={4}
          fill={labelBg}
          stroke={edgeColor}
          strokeWidth={1}
          style={{ pointerEvents: 'none' }}
        />
        <text
          x={0}
          y={5}
          textAnchor="middle"
          fontSize={10}
          fontWeight={500}
          fill={labelTextColor}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {labelTextContent}
        </text>
      </g>
    </>
  );
}

