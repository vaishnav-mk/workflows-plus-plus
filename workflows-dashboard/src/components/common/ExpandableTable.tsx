"use client";

import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { ExpandableTableProps } from "@/types/components";

export type { ExpandableTableProps };

export function ExpandableTable<TData>({
  data,
  columns,
  expandedRows,
  onToggleExpand,
  getRowId,
  renderExpandedContent,
}: ExpandableTableProps<TData>) {
  const expandColumn: ColumnDef<TData> = {
    id: "expand",
    header: () => "",
    size: 40,
    cell: ({ row }) => {
      const rowId = getRowId(row.original);
      const isExpanded = expandedRows?.has(rowId) ?? false;
      return (
        <div className="text-gray-400">
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-label={isExpanded ? "Collapsed" : "Expanded"}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      );
    },
  };

  const allColumns = [expandColumn, ...columns];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-full table-fixed">
        <colgroup>
          {allColumns.map((col, idx) => (
            <col
              key={col.id || (col as any).accessorKey || idx}
              style={{
                width: (col as any).size ? `${(col as any).size}px` : "auto",
              }}
            />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-white">
            {allColumns.map((col, idx) => (
              <th
                key={col.id || (col as any).accessorKey || idx}
                className="p-3 first:pl-4 border-b border-neutral-200 hover:bg-neutral-100 transition-all text-gray-800 font-semibold text-left"
                style={{
                  width: (col as any).size ? `${(col as any).size}px` : undefined,
                }}
              >
                {col.header && typeof col.header === "function" ? col.header({} as any) : col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {data.map((row, rowIdx) => {
            const rowId = getRowId(row);
            const isExpanded = expandedRows?.has(rowId) ?? false;
            return (
              <React.Fragment key={rowId}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onToggleExpand?.(rowId)}
                >
                  {allColumns.map((col, colIdx) => {
                    const accessorKey = (col as any).accessorKey as string | undefined;
                    let cell: React.ReactNode = null;
                    if (col.cell && typeof col.cell === "function") {
                      cell = col.cell({
                        getValue: () => accessorKey ? (row as any)[accessorKey] : null,
                        row: { original: row },
                      } as any);
                    } else if (accessorKey) {
                      cell = (row as any)[accessorKey];
                    }
                    return (
                      <td
                        key={col.id || accessorKey || colIdx}
                        className="p-3 first:pl-4 border-b border-neutral-200 overflow-hidden"
                        style={{
                          width: (col as any).size ? `${(col as any).size}px` : undefined,
                          maxWidth: (col as any).size ? `${(col as any).size}px` : undefined,
                        }}
                        onClick={(e) => {
                          
                          const target = e.target as HTMLElement;
                          if (target.tagName === "A" || target.tagName === "BUTTON" || target.closest("a") || target.closest("button")) {
                            e.stopPropagation();
                          }
                        }}
                      >
                        <div className="truncate" title={typeof cell === "string" ? cell : undefined}>
                          {cell}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                {isExpanded && renderExpandedContent && (
                  <tr>
                    <td
                      colSpan={allColumns.length}
                      className="p-4 bg-gray-50 border-b border-neutral-200"
                    >
                      {renderExpandedContent(row)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

