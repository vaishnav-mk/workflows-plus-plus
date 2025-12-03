"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className,
  disabled = false,
  label,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || "");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (option: DropdownOption) => {
    setSelectedValue(option.value);
    onChange?.(option.value);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn("relative inline-block w-full", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={false}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "group flex items-center justify-between w-full px-3 py-2 h-9 text-sm font-medium text-gray-900 bg-white border rounded-lg hover:bg-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
          isOpen || "hover:border-gray-400",
          isOpen
            ? "border-primary"
            : "border-gray-300 focus:border-primary"
        )}
      >
        <span className="truncate text-left flex items-center gap-2">
          {selectedOption?.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
          {displayText}
        </span>
        <ChevronDownIcon
          className={cn("w-4 h-4 text-gray-400 ml-2 flex-shrink-0 transition-transform", isOpen && "transform rotate-180")}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <ul
            role="listbox"
            tabIndex={-1}
            className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none overflow-y-auto max-h-60"
          >
            {options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={selectedValue === option.value}
                onClick={() => handleSelect(option)}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer transition-colors text-left flex items-center gap-2",
                  selectedValue === option.value || "hover:bg-gray-100",
                  selectedValue === option.value
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-900"
                )}
              >
                {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                {option.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

