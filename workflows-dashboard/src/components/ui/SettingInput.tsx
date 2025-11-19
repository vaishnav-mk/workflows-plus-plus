'use client';

import React from 'react';

interface SettingInputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export function SettingInput({ 
  label, 
  placeholder, 
  type = 'text', 
  value, 
  defaultValue, 
  onChange, 
  className 
}: SettingInputProps) {
  // Use controlled component if value is provided, otherwise uncontrolled
  const isControlled = value !== undefined;
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        {...(isControlled ? { value } : { defaultValue })}
        onChange={onChange}
        className={className || "w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}
      />
    </div>
  );
}
