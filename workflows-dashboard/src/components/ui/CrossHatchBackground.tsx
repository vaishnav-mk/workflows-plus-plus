'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type HatchPattern = 'large' | 'small' | 'custom';

export interface CrossHatchBackgroundProps {
  /**
   * Type of hatching pattern
   * - 'large': 10px spacing (default, used for page backgrounds)
   * - 'small': 8px spacing (used for cards/components)
   * - 'custom': Use customSpacing prop
   */
  pattern?: HatchPattern;
  /**
   * Custom spacing for pattern (only used when pattern is 'custom')
   */
  customSpacing?: number;
  /**
   * Opacity of the pattern (0-1)
   * @default 0.03
   */
  opacity?: number;
  /**
   * Whether pointer events should be disabled
   * @default true
   */
  pointerEvents?: boolean;
  /**
   * Additional className
   */
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
  pointerEvents = true,
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


