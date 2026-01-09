"use client";

import React from "react";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

export interface FormFieldProps {
  label: string;
  error?: string;
  warning?: string;
  info?: string;
  success?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

export function FormField({
  label,
  error,
  warning,
  info,
  success,
  required = false,
  children,
  htmlFor,
  className = "",
}: FormFieldProps) {
  const hasError = !!error;
  const hasWarning = !!warning && !hasError;
  const hasSuccess = !!success && !hasError && !hasWarning;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {children}
        
        {/* Status icon inside input */}
        {(hasError || hasWarning || hasSuccess) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {hasError && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            {hasWarning && (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
            {hasSuccess && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600 flex items-start gap-1.5 mt-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}

      {/* Warning message */}
      {warning && !error && (
        <p className="text-xs text-amber-600 flex items-start gap-1.5 mt-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{warning}</span>
        </p>
      )}

      {/* Info message */}
      {info && !error && !warning && (
        <p className="text-xs text-gray-500 flex items-start gap-1.5 mt-1">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{info}</span>
        </p>
      )}

      {/* Success message */}
      {success && !error && !warning && (
        <p className="text-xs text-green-600 flex items-start gap-1.5 mt-1">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </p>
      )}
    </div>
  );
}

// Validation helpers
export const validators = {
  required: (value: any, message = "This field is required") => {
    if (value === null || value === undefined || value === "") {
      return message;
    }
    return null;
  },

  minLength: (value: string, min: number, message?: string) => {
    if (value && value.length < min) {
      return message || `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value: string, max: number, message?: string) => {
    if (value && value.length > max) {
      return message || `Must be at most ${max} characters`;
    }
    return null;
  },

  email: (value: string, message = "Please enter a valid email address") => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return message;
    }
    return null;
  },

  url: (value: string, message = "Please enter a valid URL") => {
    if (value && !/^https?:\/\/.+/.test(value)) {
      return message;
    }
    return null;
  },

  number: (value: any, message = "Please enter a valid number") => {
    if (value && isNaN(Number(value))) {
      return message;
    }
    return null;
  },

  min: (value: number, min: number, message?: string) => {
    if (value !== null && value !== undefined && value < min) {
      return message || `Must be at least ${min}`;
    }
    return null;
  },

  max: (value: number, max: number, message?: string) => {
    if (value !== null && value !== undefined && value > max) {
      return message || `Must be at most ${max}`;
    }
    return null;
  },

  pattern: (value: string, pattern: RegExp, message = "Invalid format") => {
    if (value && !pattern.test(value)) {
      return message;
    }
    return null;
  },

  custom: (value: any, validator: (v: any) => boolean, message: string) => {
    if (value && !validator(value)) {
      return message;
    }
    return null;
  },
};

// Compose multiple validators
export function composeValidators(
  ...validators: Array<(value: any) => string | null>
): (value: any) => string | null {
  return (value: any) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return null;
  };
}
