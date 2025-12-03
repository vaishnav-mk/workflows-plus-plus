'use client';

import React from 'react';
import { Button } from '@/components';

interface SettingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function SettingButton({ children, onClick, className }: SettingButtonProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      className={className}
    >
      {children}
    </Button>
  );
}
