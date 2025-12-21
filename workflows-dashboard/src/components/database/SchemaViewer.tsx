"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Database } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface TableInfo {
  name: string;
  sql?: string;
  schema?: string;
}

function normalizeTableInfo(table: TableInfo): { name: string; sql: string } {
  return {
    name: table.name,
    sql: table.sql || table.schema || ""
  };
}

interface SchemaViewerProps {
  tables: TableInfo[];
  onTableSelect?: (tableName: string) => void;
  selectedTable?: string | null;
}

export function SchemaViewer({
  tables,
  onTableSelect,
  selectedTable
}: SchemaViewerProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(
    new Set(tables.slice(0, 3).map((t) => t.name))
  );

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const parseTableSchema = (sql: string | undefined) => {
    const columns: Array<{
      name: string;
      type: string;
      constraints: string[];
    }> = [];

    if (!sql) return columns;

    const columnMatch = sql.match(/CREATE TABLE\s+\w+\s*\(([\s\S]*)\)/i);
    if (columnMatch) {
      const columnDefs = columnMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(
          (s) => !s.startsWith("FOREIGN KEY") && !s.startsWith("PRIMARY KEY")
        );

      columnDefs.forEach((def) => {
        const parts = def.trim().split(/\s+/);
        if (parts.length >= 2) {
          const name = parts[0];
          const type = parts[1];
          const constraints = parts
            .slice(2)
            .filter((p) =>
              ["PRIMARY", "KEY", "UNIQUE", "NOT", "NULL", "DEFAULT"].includes(
                p.toUpperCase()
              )
            );
          columns.push({ name, type, constraints });
        }
      });
    }

    return columns;
  };

  return (
    <div className="space-y-2">
      {tables.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No tables found in this database
        </div>
      ) : (
        tables.map((table) => {
          const normalized = normalizeTableInfo(table);
          const isExpanded = expandedTables.has(normalized.name);
          const isSelected = selectedTable === normalized.name;
          const columns = parseTableSchema(normalized.sql);

          return (
            <div
              key={normalized.name}
              className={`border rounded-lg overflow-hidden transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div
                className="flex items-center justify-between p-3 cursor-pointer bg-white"
                onClick={() => {
                  toggleTable(normalized.name);
                  onTableSelect?.(normalized.name);
                }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <Database className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-900 font-mono truncate">
                    {normalized.name}
                  </span>
                  {columns.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({columns.length} columns)
                    </span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {columns.length > 0 ? (
                    <div className="p-3 space-y-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2">
                        Columns
                      </div>
                      <div className="space-y-1">
                        {columns.map((col, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs bg-white p-2 rounded border border-gray-200"
                          >
                            <span className="font-mono font-medium text-gray-900 min-w-[120px]">
                              {col.name}
                            </span>
                            <span className="text-gray-600">{col.type}</span>
                            {col.constraints.length > 0 && (
                              <span className="text-gray-500 text-xs">
                                {col.constraints.join(" ")}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="p-3 border-t border-gray-200">
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      SQL Definition
                    </div>
                    <div className="rounded overflow-hidden border border-gray-200">
                      <SyntaxHighlighter
                        language="sql"
                        style={oneLight}
                        customStyle={{
                          margin: 0,
                          padding: "12px",
                          fontSize: "11px",
                          lineHeight: "1.5",
                          borderRadius: "4px"
                        }}
                      >
                        {normalized.sql}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
