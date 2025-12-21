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
        const parsed = JSON.parse(obj);
        return JSON.stringify(parsed, null, 2);
      } catch {
        if (obj.includes('{') && obj.includes('}')) {
          let formatted = obj;
          
          formatted = formatted.replace(/\{/g, '{\n  ');
          formatted = formatted.replace(/\}/g, '\n}');
          
          formatted = formatted.replace(/,/g, ',\n  ');
          
          formatted = formatted.replace(/:/g, ': ');
          
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
        <div className="text-gray-400 pr-3 select-none flex-shrink-0">
          {lines.map((_, index) => (
            <div key={index} className="leading-5">
              {String(index + 1).padStart(2, ' ')}
            </div>
          ))}
        </div>
        
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
