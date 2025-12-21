'use client';

import React from 'react';
import { Input } from '@/components';

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
  const isControlled = value !== undefined;
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <Input
        type={type}
        placeholder={placeholder}
        {...(isControlled ? { value } : { defaultValue })}
        onChange={onChange}
        className={className}
      />
    </div>
  );
}
