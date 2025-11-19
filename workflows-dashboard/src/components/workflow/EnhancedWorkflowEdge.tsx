'use client';

import React, { memo, useState } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import { useWorkflowStore } from '../../stores/workflowStore';

const EnhancedWorkflowEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { setSelectedEdge } = useWorkflowStore();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEdge({ id } as any);
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: '#6b7280', // Gray color to match theme
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          className="nodrag nopan"
          onMouseEnter={() => {
            setIsHovered(true);
          }}
          onMouseLeave={() => {
            setIsHovered(false);
          }}
        >
          {isHovered && (
            <button
              onClick={handleAddClick}
              className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 flex items-center justify-center shadow-sm border border-gray-300 transition-all duration-200 z-10 text-xs font-medium"
              title="Add node between"
            >
              +
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

EnhancedWorkflowEdge.displayName = 'EnhancedWorkflowEdge';

export { EnhancedWorkflowEdge };
