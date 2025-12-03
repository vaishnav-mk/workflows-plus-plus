"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select",
  className,
  disabled = false,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedValue, setSelectedValue] = useState(value || "");
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
      const selectedOption = options.find((opt) => opt.value === value);
      setInputValue(selectedOption ? selectedOption.label : "");
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        const selectedOption = options.find((opt) => opt.value === selectedValue);
        setInputValue(selectedOption ? selectedOption.label : "");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, selectedValue, options]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    
    const exactMatch = options.find(
      (opt) => opt.label.toLowerCase() === newValue.toLowerCase()
    );
    if (exactMatch) {
      setSelectedValue(exactMatch.value);
      onChange?.(exactMatch.value);
    }
  };

  const handleSelect = (option: ComboboxOption) => {
    setSelectedValue(option.value);
    setInputValue(option.label);
    onChange?.(option.value);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div ref={comboboxRef} className={cn("relative inline-block", className)}>
      <div
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "flex items-center border border-gray-300 rounded-lg focus-within:border-primary focus-within:ring-2 focus-within:ring-primary",
          isOpen && "border-primary ring-2 ring-primary",
          disabled && "opacity-50"
        )}
      >
        <input
          type="text"
          aria-autocomplete="list"
          aria-controls={isOpen ? "combobox-menu" : undefined}
          autoComplete="off"
          aria-invalid={false}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          className="flex-1 px-3 py-2 h-9 text-sm font-medium text-gray-900 bg-white rounded-l-lg rounded-r-none border-0 focus:outline-none disabled:cursor-not-allowed"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={handleToggle}
          disabled={disabled}
          className="w-8 h-9 bg-[rgb(242,242,242)] cursor-pointer rounded-r-lg rounded-l-none flex items-center justify-center hover:bg-gray-200 transition-colors disabled:cursor-not-allowed border-0 flex-shrink-0"
          aria-label="Toggle dropdown"
        >
          <ChevronDownIcon
            className={cn("w-4 h-4 text-gray-600 transition-transform", isOpen && "transform rotate-180")}
          />
        </button>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <ul
            id="combobox-menu"
            role="listbox"
            tabIndex={-1}
            className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none"
          >
            {filteredOptions.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={selectedValue === option.value}
                onClick={() => handleSelect(option)}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg",
                  selectedValue === option.value
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

