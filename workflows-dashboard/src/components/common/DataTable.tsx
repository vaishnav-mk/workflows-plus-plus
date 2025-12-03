"use client";

import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableCell,
  MoreVerticalIcon,
  Button,
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
    // Filter out action columns
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
              return (
                <th
                  key={header.id}
                  className={cn(
                    "p-3 first:pl-4 border-b border-neutral-200 hover:bg-neutral-100 transition-all text-gray-800 font-semibold text-left"
                  )}
                >
                  <div className="flex items-center gap-2">
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
        {table.getRowModel().rows.map((row) => (
          <tr
            key={row.id}
            onClick={() => onRowAction?.(row.original, "click")}
            className={onRowAction ? "cursor-pointer hover:bg-gray-50" : ""}
          >
            {row.getVisibleCells().map((cell) => {
              return (
                <TableCell
                  key={cell.id}
                  isActionColumn={false}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              );
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
