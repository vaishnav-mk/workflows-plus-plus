"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  marks?: Array<{ value: number; label?: string }>;
  className?: string;
}

export function Slider({
  min = 0,
  max = 1,
  step = 0.01,
  value,
  onChange,
  marks,
  className,
}: SliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return value;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const rawValue = min + percent * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      return Math.max(min, Math.min(max, steppedValue));
    },
    [min, max, step, value]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const newValue = getValueFromPosition(e.clientX);
      onChange(newValue);
    },
    [getValueFromPosition, onChange]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newValue = getValueFromPosition(e.clientX);
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, getValueFromPosition, onChange]);

  const defaultMarks = marks || [
    { value: min },
    { value: value },
    { value: max },
  ];

  const activeColor = "rgb(0, 81, 195)";

  return (
    <div className={cn("relative", className)}>
      <div
        ref={sliderRef}
        className="relative h-[14px] py-[5px] w-full rounded-[6px] cursor-pointer select-none touch-none"
        style={{
          WebkitTapHighlightColor: "rgba(0, 0, 0, 0)",
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-[5px] left-0 right-0 h-[4px] bg-gray-200 rounded-full" />

        <div
          className="absolute top-[5px] left-0 h-[4px] rounded-full"
          style={{
            backgroundColor: activeColor,
            width: `${percentage}%`,
          }}
        />

        <div className="absolute top-[5px] left-0 right-0 h-[4px]">
          {defaultMarks.map((mark, idx) => {
            const markPercent = ((mark.value - min) / (max - min)) * 100;
            const isActive = mark.value <= value;
            return (
              <span
                key={idx}
                className="absolute w-[4px] h-[4px] rounded-full border-2 -translate-y-1/2 top-1/2"
                style={{
                  left: `${markPercent}%`,
                  borderColor: isActive ? activeColor : "#d1d5db",
                  backgroundColor: isActive ? activeColor : "#fff",
                }}
              />
            );
          })}
        </div>

        <div
          ref={handleRef}
          tabIndex={0}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          className="absolute w-[14px] h-[14px] rounded-full border-2 bg-white -translate-x-1/2 -translate-y-1/2 top-1/2 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          style={{
            borderColor: activeColor,
            left: `${percentage}%`,
          }}
          onMouseDown={handleMouseDown}
        />
      </div>

      <div className="relative mt-1 h-6">
        {defaultMarks.map((mark, idx) => {
          const markPercent = ((mark.value - min) / (max - min)) * 100;
          const isActive = Math.abs(mark.value - value) < step / 2;
          const label = mark.label ?? mark.value.toFixed(1);

          return (
            <span
              key={idx}
              className="absolute text-xs -translate-x-1/2"
              style={{
                left: `${markPercent}%`,
                color: isActive ? "#111827" : "#9ca3af",
                fontWeight: isActive ? 600 : 400,
                backgroundColor: isActive ? "white" : "transparent",
                padding: isActive ? "0 7px" : "0",
                zIndex: isActive ? 1000 : 1,
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

