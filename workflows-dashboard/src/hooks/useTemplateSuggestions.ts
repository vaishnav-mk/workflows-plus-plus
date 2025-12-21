import { useState, useRef, useEffect } from "react";
import type { TemplateSuggestion } from "@/types/template";
import { generateTemplateSuggestions, resolveNodeName } from "@/utils/template";

interface UseTemplateSuggestionsOptions {
  availableNodes: Array<{
    id: string;
    data?: { label?: string; type?: string };
    type?: string;
  }>;
  getCachedNodeDef: (nodeType: string) => Promise<any>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function useTemplateSuggestions({
  availableNodes,
  getCachedNodeDef,
  containerRef,
  inputRef
}: UseTemplateSuggestionsOptions) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const updateSuggestions = async (
    input: string,
    cursorPos: number
  ): Promise<void> => {
    const newSuggestions = await generateTemplateSuggestions(
      input,
      cursorPos,
      availableNodes,
      getCachedNodeDef,
      (nodeId: string) => resolveNodeName(nodeId, availableNodes)
    );
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [containerRef, inputRef]);

  return {
    showSuggestions,
    suggestions,
    suggestionsRef,
    updateSuggestions,
    setShowSuggestions
  };
}

