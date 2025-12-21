import React from "react";
import { Input, IconButton, SearchIcon, RefreshIcon } from "@/components/ui";
import type { SearchBarProps } from "@/types/components";

export function SearchBar({
  placeholder = "Search",
  value,
  onChange,
  onRefresh,
  loading = false,
}: SearchBarProps) {
  return (
    <div className="flex gap-3 mb-4">
      <Input
        type="text"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value)}
        placeholder={placeholder}
        icon={<SearchIcon className="w-4 h-4" />}
      />
      {onRefresh && (
        <IconButton
          onClick={onRefresh}
          aria-label="Refresh"
          className="bg-white hover:bg-gray-50"
          variant="outline"
        >
          <RefreshIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </IconButton>
      )}
    </div>
  );
}

