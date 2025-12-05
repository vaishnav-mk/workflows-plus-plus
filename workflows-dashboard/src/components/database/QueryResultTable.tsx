"use client";

import React, { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef
} from "@tanstack/react-table";
import { Table } from "@/components/ui/Table";

interface QueryResultTableProps {
  results: any[];
  meta?: any;
}

export function QueryResultTable({ results, meta }: QueryResultTableProps) {
  // Parse results - handle both string and object formats
  const parsedResults = useMemo(() => {
    if (!Array.isArray(results)) {
      // If results is not an array, try to extract it
      if (
        results &&
        typeof results === "object" &&
        results !== null &&
        "results" in results
      ) {
        const resultsObj = results as { results?: any[] };
        return Array.isArray(resultsObj.results) ? resultsObj.results : [];
      }
      return [];
    }

    // Check if the first row has a nested "results" array (Cloudflare API format)
    if (
      results.length > 0 &&
      results[0] &&
      typeof results[0] === "object" &&
      "results" in results[0]
    ) {
      const firstRow = results[0] as {
        results?: any[];
        success?: boolean;
        meta?: any;
      };
      if (Array.isArray(firstRow.results)) {
        // Extract the nested results array
        return firstRow.results;
      }
    }

    return results.map((row) => {
      if (typeof row === "string") {
        try {
          const parsed = JSON.parse(row);
          return typeof parsed === "object" && parsed !== null
            ? parsed
            : { value: parsed };
        } catch {
          return { value: row };
        }
      }

      // If row is an object, parse any string values that look like JSON
      if (typeof row === "object" && row !== null) {
        const parsed: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (value === null || value === undefined) {
            parsed[key] = value;
          } else if (typeof value === "string") {
            // Try to parse if it looks like JSON
            const trimmed = value.trim();
            if (
              (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
              trimmed.length > 1
            ) {
              try {
                parsed[key] = JSON.parse(value);
              } catch {
                parsed[key] = value;
              }
            } else {
              parsed[key] = value;
            }
          } else {
            parsed[key] = value;
          }
        }
        return parsed;
      }

      return row;
    });
  }, [results]);

  // Generate columns dynamically from the first row
  const columns = useMemo<ColumnDef<any>[]>(() => {
    if (parsedResults.length === 0) return [];

    const firstRow = parsedResults[0];
    return Object.keys(firstRow).map((key) => ({
      accessorKey: key,
      header: key,
      cell: ({ getValue }: any) => {
        const value = getValue();
        if (value === null || value === undefined) {
          return <span className="text-gray-400 italic">null</span>;
        }
        if (typeof value === "boolean") {
          return (
            <span className={value ? "text-green-600" : "text-red-600"}>
              {String(value)}
            </span>
          );
        }
        if (typeof value === "object") {
          return (
            <pre className="text-xs font-mono bg-gray-50 p-1 rounded max-w-xs overflow-x-auto">
              {JSON.stringify(value, null, 2)}
            </pre>
          );
        }
        return <span className="text-gray-900">{String(value)}</span>;
      }
    }));
  }, [parsedResults]);

  const table = useReactTable({
    data: parsedResults.slice(0, 1000), // Limit to 1000 rows for performance
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  if (parsedResults.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">No results returned</div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {parsedResults.length} row{parsedResults.length !== 1 ? "s" : ""}
          {parsedResults.length > 1000 && " (showing first 1000)"}
        </span>
        {meta && (
          <div className="flex gap-4 text-xs text-gray-500">
            {meta.duration && (
              <span>Duration: {meta.duration.toFixed(2)}ms</span>
            )}
            {meta.rows_read !== undefined && (
              <span>Read: {meta.rows_read}</span>
            )}
            {meta.rows_written !== undefined && meta.rows_written > 0 && (
              <span>Written: {meta.rows_written}</span>
            )}
            {meta.served_by_region && (
              <span>Region: {meta.served_by_region}</span>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg">
        <Table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gray-50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-2 text-sm border-b border-gray-100"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
