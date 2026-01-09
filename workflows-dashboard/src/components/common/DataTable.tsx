"use client";

import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableCell,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { DataTableProps } from "@/types/components";

export type { DataTableProps };

export function DataTable<TData>({
  data,
  columns,
  onRowAction,
}: DataTableProps<TData>) {
  const tableColumns = React.useMemo(() => {
    return columns.filter(col => col.id !== 'actions');
  }, [columns]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <thead>
            {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="bg-white">
            {headerGroup.headers.map((header) => {
              const align = (header.column.columnDef.meta as any)?.align || 'left';
              return (
                <th
                  key={header.id}
                  className={cn(
                    "p-3 first:pl-4 border-b border-neutral-200 hover:bg-neutral-100 transition-all text-gray-800 font-semibold",
                    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  <div className={cn("gap-2", align === 'center' ? "flex items-center justify-center" : align === 'right' ? "flex items-center justify-end" : "flex items-center")}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </div>
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody className="bg-white">
        {table.getRowModel().rows.map((row) => {
          const isSelected = (row.original as any)?.isSelected || false;
          return (
            <tr
              key={row.id}
              onClick={() => onRowAction?.(row.original, "click")}
              className={cn(
                onRowAction ? "cursor-pointer hover:bg-gray-50 transition-colors" : "",
                isSelected && "bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100"
              )}
            >
              {row.getVisibleCells().map((cell) => {
                const align = (cell.column.columnDef.meta as any)?.align || 'left';
                return (
                  <TableCell
                    key={cell.id}
                    isActionColumn={false}
                    className={align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
