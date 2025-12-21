"use client";

import React, { useState, useMemo } from "react";

export interface DateDisplayProps {
  date: number | string;
  className?: string;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const isPast = diffMs < 0;
  const prefix = isPast ? "" : "in ";

  if (diffSeconds < 60) {
    return isPast ? "just now" : "in a few seconds";
  } else if (diffMinutes < 60) {
    return `${prefix}${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ${isPast ? "ago" : ""}`;
  } else if (diffHours < 24) {
    return `${prefix}${diffHours} hour${diffHours !== 1 ? "s" : ""} ${isPast ? "ago" : ""}`;
  } else if (diffDays < 7) {
    return `${prefix}${diffDays} day${diffDays !== 1 ? "s" : ""} ${isPast ? "ago" : ""}`;
  } else if (diffWeeks < 4) {
    return `${prefix}${diffWeeks} week${diffWeeks !== 1 ? "s" : ""} ${isPast ? "ago" : ""}`;
  } else if (diffMonths < 12) {
    return `${prefix}${diffMonths} month${diffMonths !== 1 ? "s" : ""} ${isPast ? "ago" : ""}`;
  } else {
    return `${prefix}${diffYears} year${diffYears !== 1 ? "s" : ""} ${isPast ? "ago" : ""}`;
  }
}

function parseDate(date: number | string): Date {
  if (typeof date === "number") {
    return new Date(date);
  }

  const ddMMyyyyMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddMMyyyyMatch) {
    const [, day, month, year] = ddMMyyyyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  const epochMatch = date.match(/^\d+$/);
  if (epochMatch) {
    return new Date(parseInt(date));
  }

  return new Date(date);
}

export function DateDisplay({ date, className = "" }: DateDisplayProps) {
  const [isHovered, setIsHovered] = useState(false);

  const dateObj = useMemo(() => {
    try {
      return parseDate(date);
    } catch {
      return new Date();
    }
  }, [date]);

  const formattedDate = useMemo(() => {
    return dateObj.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }, [dateObj]);

  const relativeTime = useMemo(() => {
    return formatRelativeTime(dateObj);
  }, [dateObj]);

  return (
    <time
      dateTime={dateObj.toISOString()}
      className={`relative inline-flex items-center justify-center px-1.5 py-0.5 rounded text-sm text-gray-700 cursor-default transition-all duration-200 ease-in-out bg-gray-200 ${
        isHovered ? "bg-gray-300 text-gray-900" : "text-gray-700"
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={isHovered ? formattedDate : relativeTime}
    >
      <span className="relative inline-flex items-center justify-center min-w-0">
        <span
          className={`inline-block whitespace-nowrap transition-opacity duration-200 ease-in-out ${
            isHovered ? "opacity-0" : "opacity-100"
          }`}
        >
          {formattedDate}
        </span>
        <span
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-block whitespace-nowrap transition-opacity duration-200 ease-in-out ${
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {relativeTime}
        </span>
      </span>
    </time>
  );
}
