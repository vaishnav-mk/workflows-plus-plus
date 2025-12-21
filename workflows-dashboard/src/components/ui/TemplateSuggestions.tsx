"use client";

import type { TemplateSuggestion } from "@/types/template";

interface TemplateSuggestionsProps {
  suggestions: TemplateSuggestion[];
  onSelect: (suggestion: TemplateSuggestion) => void;
  suggestionsRef: React.RefObject<HTMLDivElement | null>;
}

export function TemplateSuggestions({
  suggestions,
  onSelect,
  suggestionsRef
}: TemplateSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      ref={suggestionsRef}
      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          onClick={() => onSelect(suggestion)}
          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
        >
          <div className="font-mono text-blue-700">{suggestion.display}</div>
          {suggestion.display !== suggestion.value && (
            <div className="text-xs text-gray-500 mt-0.5">{suggestion.value}</div>
          )}
        </div>
      ))}
    </div>
  );
}

