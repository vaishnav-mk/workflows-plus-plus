"use client";

import { useState, useEffect, useRef } from "react";
import {
  BaseEdge,
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer
} from "reactflow";
import { Plus, ArrowDown } from "lucide-react";

const FIRST_TIME_KEY = "workflow-edge-button-seen";

export function DefaultEdgeWithButton({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showFirstTimeGlow, setShowFirstTimeGlow] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Check if this is the first time seeing the edge button
    const hasSeenBefore = localStorage.getItem(FIRST_TIME_KEY);
    if (!hasSeenBefore) {
      setShowFirstTimeGlow(true);
    }
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Add a small delay before hiding to prevent flickering
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 100);
  };

  const handleButtonClick = () => {
    // Mark as seen when clicked
    if (showFirstTimeGlow) {
      localStorage.setItem(FIRST_TIME_KEY, "true");
      setShowFirstTimeGlow(false);
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0
  });

  const shouldShowButton = isHovered || selected || showFirstTimeGlow;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2
        }}
      />
      {/* Invisible wider path for better hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={40}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: "pointer" }}
      />
      <EdgeLabelRenderer>
        {shouldShowButton && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 1000
            }}
            className="nodrag nopan"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="relative">
              {showFirstTimeGlow && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
                  <ArrowDown className="w-5 h-5 text-blue-500" />
                  <span className="text-xs font-medium text-blue-600 whitespace-nowrap mt-1">
                    Click to add node
                  </span>
                </div>
              )}
              <button
                ref={buttonRef}
                className={`
                  w-6 h-6 bg-white border-2 border-blue-500 text-blue-500 
                  hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600
                  rounded flex items-center justify-center 
                  shadow-md
                  ${showFirstTimeGlow ? "animate-pulse ring-4 ring-blue-300 ring-opacity-50" : ""}
                `}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleButtonClick}
                title="Add node here"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
