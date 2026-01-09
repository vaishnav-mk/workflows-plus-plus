"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { isSuccessResponse } from "@/lib/api/utils";
import { ChevronDownIcon } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { AIModel } from "@/lib/api/types";

interface AIModelSelectProps {
  value?: string;
  onChange: (value: string) => void;
  task?: string;
  placeholder?: string;
}

let cachedModels: AIModel[] | null = null;
let cachePromise: Promise<AIModel[]> | null = null;

async function fetchAllModels(): Promise<AIModel[]> {
  if (cachedModels) {
    return cachedModels;
  }

  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = (async () => {
    const response = await apiClient.searchAIModels();
    if (isSuccessResponse(response)) {
      cachedModels = response.data;
      return response.data;
    }
    throw new Error("Failed to fetch models");
  })();

  try {
    return await cachePromise;
  } finally {
    cachePromise = null;
  }
}

export function AIModelSelect({
  value,
  onChange,
  task,
  placeholder = "Type to search models..."
}: AIModelSelectProps) {
  const [allModels, setAllModels] = useState<AIModel[]>(cachedModels || []);
  const [loading, setLoading] = useState(!cachedModels);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cachedModels) {
      fetchAllModels()
        .then(models => {
          setAllModels(models);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to fetch AI models:", error);
          setLoading(false);
        });
    }
  }, []);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (!inputValue && value) {
          setInputValue(value);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, inputValue, value]);

  const filteredModels = useMemo(() => {
    const searchTerm = inputValue.toLowerCase();
    return allModels
      .filter(m => {
        if (!m.name.startsWith("@cf")) return false;
        if (searchTerm && !m.name.toLowerCase().includes(searchTerm)) return false;
        return true;
      })
      .map(model => ({
        value: model.name,
        label: model.name
      }));
  }, [allModels, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
  };

  const handleSelect = (model: { value: string; label: string }) => {
    setInputValue(model.value);
    onChange(model.value);
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  return (
    <div ref={comboboxRef} className="relative inline-block w-full">
      <div
        className={cn(
          "flex items-center border border-gray-300 rounded-lg focus-within:border-primary focus-within:ring-2 focus-within:ring-primary",
          isOpen && "border-primary ring-2 ring-primary"
        )}
      >
        <input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          disabled={loading}
          className="flex-1 px-3 py-2 h-9 text-sm font-medium text-gray-900 bg-white rounded-l-lg rounded-r-none border-0 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="w-8 h-9 bg-[rgb(242,242,242)] cursor-pointer rounded-r-lg rounded-l-none flex items-center justify-center hover:bg-gray-200 transition-colors border-0 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronDownIcon
            className={cn("w-4 h-4 text-gray-600 transition-transform", isOpen && "transform rotate-180")}
          />
        </button>
      </div>

      {isOpen && !loading && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
            {filteredModels.length > 0 ? (
              <ul>
                {filteredModels.map((model) => (
                  <li
                    key={model.value}
                    onClick={() => handleSelect(model)}
                    className={cn(
                      "px-3 py-2 text-sm cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg",
                      value === model.value
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {model.label}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">No models found</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
