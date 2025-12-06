'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useNodeRegistry } from '../../hooks/useNodeRegistry';
import { TemplateBadge } from './TemplateBadge';

interface TemplateTextareaProps {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  nodeId: string;
  style?: React.CSSProperties;
}

interface TemplateSegment {
  type: 'text' | 'template';
  content: string;
  start: number;
  end: number;
}

export function TemplateTextarea({ 
  label, 
  placeholder, 
  value, 
  defaultValue, 
  onChange, 
  className,
  nodeId,
  style
}: TemplateTextareaProps) {
  const { nodes } = useWorkflowStore();
  const { catalog, getNodeByType } = useNodeRegistry();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ value: string; display: string }>>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [nodeDefCache, setNodeDefCache] = useState<Map<string, any>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get available nodes (excluding current node)
  const availableNodes = nodes.filter(n => n.id !== nodeId);

  // Helper to get node definition (with caching)
  const getCachedNodeDef = async (nodeType: string) => {
    if (nodeDefCache.has(nodeType)) {
      return nodeDefCache.get(nodeType);
    }
    const nodeDef = await getNodeByType(nodeType);
    if (nodeDef) {
      setNodeDefCache(prev => new Map(prev).set(nodeType, nodeDef));
    }
    return nodeDef;
  };

  // Parse value into segments (text and templates)
  const parseValue = (val: string): TemplateSegment[] => {
    const segments: TemplateSegment[] = [];
    const templateRegex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;

    while ((match = templateRegex.exec(val)) !== null) {
      // Add text before template
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: val.substring(lastIndex, match.index),
          start: lastIndex,
          end: match.index
        });
      }
      
      // Add template
      segments.push({
        type: 'template',
        content: match[0], // Full match including {{ }}
        start: match.index,
        end: match.index + match[0].length
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < val.length) {
      segments.push({
        type: 'text',
        content: val.substring(lastIndex),
        start: lastIndex,
        end: val.length
      });
    }
    
    return segments;
  };

  const displayValue = value !== undefined ? value : (defaultValue || '');
  const segments = parseValue(displayValue);

  // Generate suggestions based on current input
  const resolveNodeName = (nodeId: string): string => {
    const node = availableNodes.find(n => n.id === nodeId);
    if (node) {
      const label: string | null = typeof node.data?.label === 'string' && node.data.label.length > 0 ? node.data.label : null;
      const type: string | null = typeof node.type === 'string' && node.type.length > 0 ? node.type : null;
      return label || type || nodeId;
    }
    return nodeId;
  };

  const generateSuggestions = async (input: string, cursorPos: number): Promise<Array<{ value: string; display: string }>> => {
    const beforeCursor = input.substring(0, cursorPos);
    const lastOpen = beforeCursor.lastIndexOf('{{');
    const lastClose = beforeCursor.lastIndexOf('}}');
    
    // Only show suggestions if we're inside a {{ }} block
    if (lastOpen === -1 || (lastClose !== -1 && lastClose > lastOpen)) {
      return [];
    }

    const afterOpen = beforeCursor.substring(lastOpen + 2);
    const suggestionsList: Array<{ value: string; display: string }> = [];

    // Check if it starts with "state."
    const isStateFormat = afterOpen.trim().startsWith('state.');
    const pathWithoutState = isStateFormat ? afterOpen.substring(6).trim() : afterOpen.trim();
    const pathParts = pathWithoutState ? pathWithoutState.split('.') : [];

    // If no prefix or just one part, suggest node IDs
    if (pathParts.length === 0 || pathParts.length === 1 || (pathParts.length === 2 && pathParts[1].trim() === '')) {
      const nodePrefix = pathParts.length > 0 ? pathParts[0].trim().toLowerCase() : '';
      availableNodes.forEach(node => {
        const nodeId = node.id;
        const nodeLabelStr = typeof node.data?.label === 'string' ? node.data.label : (typeof node.type === 'string' ? node.type : nodeId);
        if (!nodePrefix || nodeId.toLowerCase().startsWith(nodePrefix) || nodeLabelStr.toLowerCase().includes(nodePrefix)) {
          const nodeName = resolveNodeName(nodeId);
          suggestionsList.push({
            value: `{{state.${nodeId}.output}}`,
            display: `state.${nodeName}.output`
          });
        }
      });
    } else if (pathParts.length === 2) {
      // Suggest output properties
      const nodeId = pathParts[0].trim();
      const propPrefix = pathParts[1].trim().toLowerCase();
      const node = availableNodes.find(n => n.id === nodeId);
      
      if (node) {
        const nodeName = resolveNodeName(nodeId);
        const nodeTypeStr = typeof node.data?.type === 'string' ? node.data.type : '';
        const nodeDef = await getCachedNodeDef(nodeTypeStr);
        
        const commonProps = ['output', 'input'];
        commonProps.forEach(prop => {
          if (prop.toLowerCase().startsWith(propPrefix)) {
            suggestionsList.push({
              value: `{{state.${nodeId}.${prop}}}`,
              display: `state.${nodeName}.${prop}`
            });
          }
        });
        
        if (nodeDef?.outputPorts) {
          nodeDef.outputPorts.forEach((port: { id: string; label: string; type?: string }) => {
            if (!propPrefix || port.id.toLowerCase().startsWith(propPrefix)) {
              suggestionsList.push({
                value: `{{state.${nodeId}.output.${port.id}}}`,
                display: `state.${nodeName}.output.${port.id} (${port.label})`
              });
            }
          });
        }
      }
    }

    return suggestionsList.slice(0, 15);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);

    // Generate suggestions
    generateSuggestions(newValue, cursorPos).then(newSuggestions => {
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    });

    // Call original onChange
    if (onChange) {
      onChange(e);
    }
  };

  const insertSuggestion = (suggestion: { value: string; display: string }) => {
    if (!textareaRef.current) return;

    const currentValue = value !== undefined ? value : (defaultValue || '');
    const beforeCursor = currentValue.substring(0, cursorPosition);
    const afterCursor = currentValue.substring(cursorPosition);
    
    const lastOpen = beforeCursor.lastIndexOf('{{');
    let newValue: string;
    let newCursorPos: number;
    
    if (lastOpen === -1) {
      newValue = currentValue.substring(0, cursorPosition) + suggestion.value + afterCursor;
      newCursorPos = cursorPosition + suggestion.value.length;
    } else {
      const replaceFrom = lastOpen;
      const templateContent = currentValue.substring(lastOpen);
      const nextClose = templateContent.indexOf('}}');
      const replaceTo = nextClose !== -1 ? lastOpen + nextClose + 2 : cursorPosition;
      
      newValue = currentValue.substring(0, replaceFrom) + suggestion.value + currentValue.substring(replaceTo);
      newCursorPos = replaceFrom + suggestion.value.length;
    }
    
    const syntheticEvent = {
      target: { 
        value: newValue,
        selectionStart: newCursorPos,
        selectionEnd: newCursorPos
      }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    if (onChange) {
      onChange(syntheticEvent);
    }
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);

    setShowSuggestions(false);
  };

  const removeTemplate = (templateContent: string) => {
    const currentValue = value !== undefined ? value : (defaultValue || '');
    const newValue = currentValue.replace(templateContent, '');
    
    const syntheticEvent = {
      target: { 
        value: newValue,
        selectionStart: newValue.length,
        selectionEnd: newValue.length
      }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    if (onChange) {
      onChange(syntheticEvent);
    }
  };

  const editTemplate = (index: number) => {
    setIsEditing(true);
    setEditingIndex(index);
    setTimeout(() => {
      if (textareaRef.current) {
        const segment = segments[index];
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(segment.start, segment.end);
      }
    }, 0);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isControlled = value !== undefined;
  const hasTemplates = segments.some(s => s.type === 'template');
  const showBadgeView = hasTemplates && !isEditing;

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          <span className="text-xs text-gray-500 ml-2">(Use {'{{'}nodeId.output{'}}'} or {'{{'}state.nodeId.output{'}}'} for templates)</span>
        </label>
      )}
      <div className="relative">
        {showBadgeView ? (
          <div
            className="w-full min-h-[6rem] px-3 py-2 text-sm border border-gray-300 rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white flex flex-wrap items-start gap-2 cursor-text"
            onClick={() => {
              setIsEditing(true);
              setTimeout(() => {
                textareaRef.current?.focus();
                if (textareaRef.current) {
                  const len = displayValue.length;
                  textareaRef.current.setSelectionRange(len, len);
                }
              }, 0);
            }}
            style={style}
          >
            {segments.map((segment, index) => {
              if (segment.type === 'template') {
                return (
                  <TemplateBadge
                    key={index}
                    expression={segment.content}
                    onRemove={() => removeTemplate(segment.content)}
                    onClick={() => editTemplate(index)}
                  />
                );
              } else if (segment.content) {
                return (
                  <span key={index} className="text-gray-900 whitespace-pre-wrap">
                    {segment.content}
                  </span>
                );
              }
              return null;
            })}
            {!displayValue && (
              <span className="text-gray-400">{placeholder}</span>
            )}
            <textarea
              ref={textareaRef}
              placeholder={placeholder}
              {...(isControlled ? { value: displayValue } : { defaultValue })}
              onChange={handleTextareaChange}
              onFocus={(e) => {
                setIsEditing(true);
                generateSuggestions(e.target.value, e.target.selectionStart || 0).then(suggestions => {
                  setSuggestions(suggestions);
                  setShowSuggestions(suggestions.length > 0);
                });
              }}
              onBlur={() => {
                setTimeout(() => {
                  if (hasTemplates && !showSuggestions) {
                    setIsEditing(false);
                  }
                }, 200);
              }}
              className={isEditing ? "absolute inset-0 w-full h-full px-3 py-2 text-sm border-0 outline-none bg-transparent resize-none" : "absolute inset-0 opacity-0 pointer-events-auto resize-none"}
              style={{ zIndex: isEditing ? 10 : 1, ...style }}
            />
          </div>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              placeholder={placeholder}
              {...(isControlled ? { value: displayValue } : { defaultValue })}
              onChange={handleTextareaChange}
              onFocus={(e) => {
                setIsEditing(true);
                generateSuggestions(e.target.value, e.target.selectionStart || 0).then(suggestions => {
                  setSuggestions(suggestions);
                  setShowSuggestions(suggestions.length > 0);
                });
              }}
              onBlur={() => {
                setIsEditing(false);
              }}
              className={className || "w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono h-32 resize-none"}
              style={style}
            />
            {/* Show badges below textarea when has templates */}
            {hasTemplates && segments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {segments.map((segment, index) => {
                  if (segment.type === 'template') {
                    return (
                      <TemplateBadge
                        key={index}
                        expression={segment.content}
                        onRemove={() => removeTemplate(segment.content)}
                        onClick={() => editTemplate(index)}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => insertSuggestion(suggestion)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
              >
                <div className="font-mono text-blue-700">{suggestion.display}</div>
                {suggestion.display !== suggestion.value && (
                  <div className="text-xs text-gray-500 mt-0.5">{suggestion.value}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

