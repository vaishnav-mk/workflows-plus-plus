'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'wave';
  color?: 'blue' | 'green' | 'red' | 'purple' | 'gray';
  text?: string;
  className?: string;
}

export function Loader({ 
  size = 'md', 
  variant = 'spinner', 
  color = 'blue', 
  text,
  className = '' 
}: LoaderProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
    gray: 'text-gray-600'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const renderSpinner = () => (
    <motion.div
      className={`${sizeClasses[size]} ${colorClasses[color]}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </motion.div>
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`w-2 h-2 rounded-full ${colorClasses[color].replace('text-', 'bg-')}`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <motion.div
      className={`${sizeClasses[size]} rounded-full ${colorClasses[color].replace('text-', 'bg-')}`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );

  const renderWave = () => (
    <div className="flex space-x-1">
      {[0, 1, 2, 3, 4].map((index) => (
        <motion.div
          key={index}
          className={`w-1 h-8 rounded-full ${colorClasses[color].replace('text-', 'bg-')}`}
          animate={{
            scaleY: [1, 2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'wave':
        return renderWave();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderLoader()}
      {text && (
        <motion.p
          className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium`}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

export function WorkflowLoader({ text = "Loading workflow..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader 
        size="lg" 
        variant="spinner" 
        color="blue" 
        text={text}
        className="p-8"
      />
    </div>
  );
}

export function InstanceLoader({ text = "Loading instance..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader 
        size="md" 
        variant="dots" 
        color="blue" 
        text={text}
      />
    </div>
  );
}

export function LogsLoader({ text = "Connecting to logs..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-6">
      <Loader 
        size="sm" 
        variant="wave" 
        color="green" 
        text={text}
      />
    </div>
  );
}

export function ButtonLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center space-x-2">
      <Loader size="sm" variant="spinner" color="blue" />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}

export function InlineLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center space-x-2">
      <Loader size="sm" variant="dots" color="gray" />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
}
