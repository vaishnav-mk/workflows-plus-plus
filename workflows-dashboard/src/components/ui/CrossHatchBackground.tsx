'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type HatchPattern = 'large' | 'small' | 'custom';

export interface CrossHatchBackgroundProps {
  pattern?: HatchPattern;
  customSpacing?: number;
  opacity?: number;
  pointerEvents?: boolean;
  className?: string;
}

const getPatternStyle = (pattern: HatchPattern, customSpacing?: number): string => {
  const spacing = pattern === 'custom' 
    ? customSpacing || 10 
    : pattern === 'large' 
    ? 10 
    : 8;
  
  return `
    repeating-linear-gradient(45deg, transparent, transparent ${spacing}px, rgba(0,0,0,1) ${spacing}px, rgba(0,0,0,1) ${spacing + 1}px),
    repeating-linear-gradient(-45deg, transparent, transparent ${spacing}px, rgba(0,0,0,1) ${spacing}px, rgba(0,0,0,1) ${spacing + 1}px)
  `;
};

export function CrossHatchBackground({
  pattern = 'large',
  customSpacing,
  opacity = 0.03,
  pointerEvents = false,
  className
}: CrossHatchBackgroundProps) {
  return (
    <div
      className={cn(
        'absolute inset-0',
        pointerEvents && 'pointer-events-none',
        className
      )}
      style={{
        opacity,
        backgroundImage: getPatternStyle(pattern, customSpacing)
      }}
    />
  );
}


