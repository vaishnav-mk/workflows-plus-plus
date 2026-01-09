"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface DurationInputProps {
  label: string;
  value?: number; // Value in milliseconds
  defaultValue?: number; // Default value in milliseconds
  onChange: (milliseconds: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  className?: string;
  presets?: Array<{ label: string; ms: number }>;
  showPresets?: boolean;
}

type TimeUnit = "ms" | "sec" | "min" | "hr";

const UNIT_TO_MS: Record<TimeUnit, number> = {
  ms: 1,
  sec: 1000,
  min: 60000,
  hr: 3600000,
};

const DEFAULT_PRESETS = [
  { label: "250ms", ms: 250 },
  { label: "1s", ms: 1000 },
  { label: "5s", ms: 5000 },
  { label: "30s", ms: 30000 },
  { label: "1m", ms: 60000 },
  { label: "5m", ms: 300000 },
];

export function DurationInput({
  label,
  value,
  defaultValue,
  onChange,
  placeholder = "0",
  min,
  max,
  className = "",
  presets = DEFAULT_PRESETS,
  showPresets = true,
}: DurationInputProps) {
  const currentMs = value ?? defaultValue ?? 0;

  // Determine best unit to display based on value
  const getBestUnit = (ms: number): TimeUnit => {
    if (ms === 0) return "ms";
    if (ms % UNIT_TO_MS.hr === 0) return "hr";
    if (ms % UNIT_TO_MS.min === 0) return "min";
    if (ms % UNIT_TO_MS.sec === 0) return "sec";
    return "ms";
  };

  const [unit, setUnit] = useState<TimeUnit>(getBestUnit(currentMs));
  const [displayValue, setDisplayValue] = useState<string>(
    currentMs > 0 ? String(currentMs / UNIT_TO_MS[unit]) : ""
  );

  // Update display when value changes externally
  useEffect(() => {
    if (currentMs > 0) {
      const bestUnit = getBestUnit(currentMs);
      setUnit(bestUnit);
      setDisplayValue(String(currentMs / UNIT_TO_MS[bestUnit]));
    } else {
      setDisplayValue("");
    }
  }, [currentMs]);

  const handleValueChange = (newValue: string) => {
    setDisplayValue(newValue);
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue) && numValue >= 0) {
      const ms = Math.round(numValue * UNIT_TO_MS[unit]);
      onChange(ms);
    } else if (newValue === "") {
      onChange(0);
    }
  };

  const handleUnitChange = (newUnit: TimeUnit) => {
    setUnit(newUnit);
    if (displayValue) {
      const numValue = parseFloat(displayValue);
      if (!isNaN(numValue)) {
        // Convert current display value to new unit
        const ms = numValue * UNIT_TO_MS[unit];
        const newDisplayValue = ms / UNIT_TO_MS[newUnit];
        setDisplayValue(String(newDisplayValue));
      }
    }
  };

  const handlePresetClick = (ms: number) => {
    onChange(ms);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Clock className="w-4 h-4" />
          </div>
          <input
            type="number"
            value={displayValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={placeholder}
            min={min ? min / UNIT_TO_MS[unit] : 0}
            max={max ? max / UNIT_TO_MS[unit] : undefined}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            step="any"
          />
        </div>

        <div className="flex border border-gray-300 rounded-md overflow-hidden">
          {(["ms", "sec", "min", "hr"] as TimeUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => handleUnitChange(u)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                unit === u
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } border-r border-gray-300 last:border-r-0`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {showPresets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetClick(preset.ms)}
              className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                currentMs === preset.ms
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {currentMs > 0 && (
        <p className="text-xs text-gray-500">
          = {currentMs.toLocaleString()} milliseconds
        </p>
      )}
    </div>
  );
}

