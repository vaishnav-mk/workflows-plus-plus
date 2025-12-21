"use client";

import { Handle, Position } from "reactflow";

interface NodeHandlesProps {
  nodeType: string;
  borderColor: string;
  config?: any;
}

export function NodeHandles({ nodeType, borderColor, config }: NodeHandlesProps) {
  const isConditionalRouter = nodeType === "conditional-router";
  const isParallel = nodeType === "parallel";
  const isJoin = nodeType === "join";

  return (
    <>
      {nodeType !== "entry" && !isJoin && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            top: "-4px",
            background: borderColor,
            border: "2px solid white",
            width: "12px",
            height: "12px"
          }}
        />
      )}

      {isJoin && (() => {
        const maxBranches = 5;
        return Array.from({ length: maxBranches }, (_, index) => {
          const branchId = `branch${index + 1}`;
          const positionPercent = (index / (maxBranches - 1)) * 80 + 10;
          
          return (
            <Handle
              key={branchId}
              type="target"
              id={branchId}
              position={Position.Top}
              style={{
                top: "-4px",
                background: borderColor,
                border: "2px solid white",
                width: "12px",
                height: "12px",
                left: `${positionPercent}%`,
                transform: "translateX(-50%)"
              }}
            />
          );
        });
      })()}

      {nodeType !== "return" && (
        <>
          {isConditionalRouter ? (
            (() => {
              const cases = Array.isArray(config?.cases) ? config.cases : [];

              if (cases.length === 0) {
                return (
                  <Handle
                    type="source"
                    position={Position.Bottom}
                    style={{
                      bottom: "-4px",
                      background: borderColor,
                      border: "2px solid white",
                      width: "12px",
                      height: "12px"
                    }}
                  />
                );
              }

              return cases.map((caseConfig: any, index: number) => {
                const caseName = caseConfig.case || `case${index + 1}`;
                const totalCases = cases.length;
                const positionPercent =
                  totalCases === 1 ? 50 : (index / (totalCases - 1)) * 80 + 10;

                return (
                  <Handle
                    key={caseName}
                    type="source"
                    id={caseName}
                    position={Position.Bottom}
                    style={{
                      bottom: "-4px",
                      background: borderColor,
                      border: "2px solid white",
                      width: "12px",
                      height: "12px",
                      left: `${positionPercent}%`,
                      transform: "translateX(-50%)"
                    }}
                  />
                );
              });
            })()
          ) : isParallel ? (
            (() => {
              const branches = Array.isArray(config?.branches) ? config.branches : [];
              const branchCount = Math.max(1, Math.min(branches.length, 5));

              return Array.from({ length: branchCount }, (_, index) => {
                const branchId = `branch${index + 1}`;
                const positionPercent = branchCount === 1 ? 50 : (index / (branchCount - 1)) * 80 + 10;

                return (
                  <Handle
                    key={branchId}
                    type="source"
                    id={branchId}
                    position={Position.Bottom}
                    style={{
                      bottom: "-4px",
                      background: borderColor,
                      border: "2px solid white",
                      width: "12px",
                      height: "12px",
                      left: `${positionPercent}%`,
                      transform: "translateX(-50%)"
                    }}
                  />
                );
              });
            })()
          ) : (
            <Handle
              type="source"
              position={Position.Bottom}
              style={{
                bottom: "-4px",
                background: borderColor,
                border: "2px solid white",
                width: "12px",
                height: "12px"
              }}
            />
          )}
        </>
      )}
    </>
  );
}

