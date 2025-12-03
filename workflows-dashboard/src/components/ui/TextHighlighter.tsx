import React from "react";

interface TextHighlighterProps {
  text: string;
  query?: string;
  className?: string;
}

export function TextHighlighter({ text, query, className }: TextHighlighterProps) {
  if (!query || !text) {
    return <span className={className}>{text}</span>;
  }

  
  const queryTerms = query
    .split(/\s+/)
    .filter(term => term.length > 2) 
    .map(term => term.toLowerCase().trim())
    .filter(Boolean);

  if (queryTerms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  
  const pattern = new RegExp(
    `(${queryTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );

  const parts = text.split(pattern);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isHighlighted = queryTerms.some(term => 
          part.toLowerCase().includes(term.toLowerCase())
        );
        
        if (isHighlighted && part.trim().length > 0) {
          return (
            <mark
              key={index}
              className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-medium"
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}

