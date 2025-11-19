'use client';

import React from 'react';

interface SettingTextProps {
  children: React.ReactNode;
  className?: string;
}

export function SettingText({ children, className }: SettingTextProps) {
  return (
    <div className={className || ""}>
      {children}
    </div>
  );
}
