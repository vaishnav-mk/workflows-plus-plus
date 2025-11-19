'use client';

import React from 'react';

interface SettingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function SettingButton({ children, onClick, className }: SettingButtonProps) {
  return (
    <button
      onClick={onClick}
      className={className || "px-3 py-1.5 text-xs text-blue-500 border border-blue-500 rounded hover:bg-blue-50 transition-colors"}
    >
      {children}
    </button>
  );
}
