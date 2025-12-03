import React from "react";
import ReactMarkdown from "react-markdown";
import { Badge, TextHighlighter } from "@/components/ui";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  renderHeadingsAsBadges?: boolean;
  highlightQuery?: string;
}

const extractTextFromChildren = (children: React.ReactNode): string => {
  if (typeof children === 'string') {
    return children;
  }
  if (typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    if (props && 'children' in props) {
      return extractTextFromChildren(props.children as React.ReactNode);
    }
  }
  return '';
};

export function MarkdownRenderer({ content, className, renderHeadingsAsBadges = false, highlightQuery }: MarkdownRendererProps) {
  if (!content || !content.trim()) {
    return null;
  }

  let normalizedContent = content
    .replace(/\\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\r/g, "\n");

  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2 text-gray-900">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold mt-3 mb-2 text-gray-900">{children}</h2>,
          h3: ({ children }) => {
            if (renderHeadingsAsBadges) {
              return <Badge variant="secondary" className="mt-2 mb-2 inline-block">{children}</Badge>;
            }
            return <h3 className="text-lg font-semibold mt-3 mb-2 text-gray-900">{children}</h3>;
          },
          h4: ({ children }) => <h4 className="text-base font-semibold mt-2 mb-1 text-gray-900">{children}</h4>,
          h5: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1 text-gray-900">{children}</h5>,
          h6: ({ children }) => <h6 className="text-xs font-semibold mt-2 mb-1 text-gray-900">{children}</h6>,
          
          p: ({ children }) => {
            return <p className="mb-2 text-gray-700 leading-relaxed">{children}</p>;
          },
          
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 ml-4 text-gray-700">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 ml-4 text-gray-700">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-sm font-mono mb-2" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-sm font-mono mb-2">
              {children}
            </pre>
          ),
          
          
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {children}
            </a>
          ),
          
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">
              {children}
            </blockquote>
          ),
          
          hr: () => <hr className="my-4 border-gray-300" />,
          
          strong: ({ children }) => {
            const textContent = extractTextFromChildren(children);
            
            if (highlightQuery && textContent) {
              return (
                <strong className="font-semibold text-gray-900">
                  <TextHighlighter text={textContent} query={highlightQuery} />
                </strong>
              );
            }
            return <strong className="font-semibold text-gray-900">{children}</strong>;
          },
          em: ({ children }) => {
            const textContent = extractTextFromChildren(children);
            
            if (highlightQuery && textContent) {
              return (
                <em className="italic">
                  <TextHighlighter text={textContent} query={highlightQuery} />
                </em>
              );
            }
            return <em className="italic">{children}</em>;
          },
          
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border border-gray-300 rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
          th: ({ children }) => <th className="px-4 py-2 text-left font-semibold text-gray-900">{children}</th>,
          td: ({ children }) => <td className="px-4 py-2 text-gray-700">{children}</td>,
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
