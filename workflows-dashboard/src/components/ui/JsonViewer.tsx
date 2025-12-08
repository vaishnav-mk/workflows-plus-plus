'use client';

import React from 'react';

interface JsonViewerProps {
  data: any;
  className?: string;
}

export function JsonViewer({ data, className = '' }: JsonViewerProps) {
  const formatJson = (obj: any): string => {
    if (typeof obj === 'string') {
      try {
        // Try to parse if it's a JSON string
        const parsed = JSON.parse(obj);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If it's not valid JSON, try to format it manually for better readability
        if (obj.includes('{') && obj.includes('}')) {
          // Try to add line breaks and indentation manually
          let formatted = obj;
          
          // Add line breaks after opening braces
          formatted = formatted.replace(/\{/g, '{\n  ');
          formatted = formatted.replace(/\}/g, '\n}');
          
          // Add line breaks after commas
          formatted = formatted.replace(/,/g, ',\n  ');
          
          // Add line breaks after colons for better readability
          formatted = formatted.replace(/:/g, ': ');
          
          // Clean up extra spaces and line breaks
          formatted = formatted.replace(/\n\s*\n/g, '\n');
          formatted = formatted.replace(/\s+/g, ' ');
          formatted = formatted.replace(/\{\s+/g, '{\n  ');
          formatted = formatted.replace(/\s+\}/g, '\n}');
          formatted = formatted.replace(/,\s+/g, ',\n  ');
          
          return formatted;
        }
        return obj;
      }
    }
    if (obj === null || obj === undefined) {
      return 'null';
    }
    return JSON.stringify(obj, null, 2);
  };

  const jsonString = formatJson(data);
  const lines = jsonString.split('\n');

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded p-3 font-mono text-xs overflow-auto max-h-96 ${className}`}>
      <div className="flex">
        {/* Line numbers */}
        <div className="text-gray-400 pr-3 select-none flex-shrink-0">
          {lines.map((_, index) => (
            <div key={index} className="leading-5">
              {String(index + 1).padStart(2, ' ')}
            </div>
          ))}
        </div>
        
        {/* JSON content */}
        <div className="flex-1 text-gray-900 min-w-0">
          {lines.map((line, index) => (
            <div key={index} className="leading-5 whitespace-pre-wrap break-words">
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
