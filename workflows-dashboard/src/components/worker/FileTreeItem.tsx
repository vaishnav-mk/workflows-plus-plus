"use client";

import { useState } from "react";
import type { FileTreeItemProps } from "@/types/worker";

export function FileTreeItem({
  node,
  level,
  selectedPath,
  onSelect
}: FileTreeItemProps) {
  const paddingLeft = 10 + level * 12;
  const [open, setOpen] = useState(false);

  if (node.type === "folder") {
    return (
      <div className="mb-0.5">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-gray-800 hover:bg-gray-100"
          style={{ paddingLeft }}
        >
          <span className="text-gray-500 select-none w-3 text-center text-[10px]">
            {open ? "▾" : "▸"}
          </span>
          <span className="font-medium text-gray-900 truncate">
            {node.name}
          </span>
        </button>
        {open && node.children.length > 0 && (
          <div>
            {node.children.map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected =
    selectedPath === node.path || selectedPath === node.module.name;

  return (
    <button
      type="button"
      onClick={() => onSelect(node.module.name)}
      className={`flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-left border border-transparent ${
        isSelected
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "text-gray-800 hover:bg-gray-100"
      }`}
      style={{ paddingLeft }}
    >
      <span className="text-gray-400 text-[9px]">●</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

