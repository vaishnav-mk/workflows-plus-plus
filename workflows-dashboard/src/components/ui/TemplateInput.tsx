"use client";

import React, { useState, useRef } from "react";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useNodeRegistry } from "@/hooks/useNodeRegistry";
import { TemplateFieldView } from "./TemplateFieldView";
import { TemplateSuggestions } from "./TemplateSuggestions";
import { useTemplateSuggestions } from "@/hooks/useTemplateSuggestions";
import type { TemplateInputProps } from "@/types/template";
import { parseTemplateValue } from "@/utils/template";

export function TemplateInput({
  label,
  placeholder,
  type = "text",
  value,
  defaultValue,
  onChange,
  className,
  nodeId
}: TemplateInputProps) {
  const { nodes } = useWorkflowStore();
  const { getNodeByType } = useNodeRegistry();
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [nodeDefCache, setNodeDefCache] = useState<Map<string, any>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const availableNodes = nodes.filter((n) => n.id !== nodeId);

  const getCachedNodeDef = async (nodeType: string) => {
    if (nodeDefCache.has(nodeType)) {
      return nodeDefCache.get(nodeType);
    }
    const nodeDef = await getNodeByType(nodeType);
    if (nodeDef) {
      setNodeDefCache((prev) => new Map(prev).set(nodeType, nodeDef));
    }
    return nodeDef;
  };

  const {
    showSuggestions,
    suggestions,
    suggestionsRef,
    updateSuggestions,
    setShowSuggestions
  } = useTemplateSuggestions({
    availableNodes,
    getCachedNodeDef,
    containerRef,
    inputRef
  });

  const displayValue = value !== undefined ? value : defaultValue || "";
  const segments = parseTemplateValue(displayValue);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = (e.target as HTMLInputElement).selectionStart || 0;
    setCursorPosition(cursorPos);

    updateSuggestions(newValue, cursorPos);

    if (onChange) {
      onChange(e as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const insertSuggestion = (suggestion: { value: string; display: string }) => {
    if (!inputRef.current) return;

    const currentValue = value !== undefined ? value : defaultValue || "";
    const beforeCursor = currentValue.substring(0, cursorPosition);
    const afterCursor = currentValue.substring(cursorPosition);

    const lastOpen = beforeCursor.lastIndexOf("{{");
    let newValue: string;
    let newCursorPos: number;

    if (lastOpen === -1) {
      newValue =
        currentValue.substring(0, cursorPosition) +
        suggestion.value +
        afterCursor;
      newCursorPos = cursorPosition + suggestion.value.length;
    } else {
      const replaceFrom = lastOpen;
      const templateContent = currentValue.substring(lastOpen);
      const nextClose = templateContent.indexOf("}}");
      const replaceTo =
        nextClose !== -1 ? lastOpen + nextClose + 2 : cursorPosition;

      newValue =
        currentValue.substring(0, replaceFrom) +
        suggestion.value +
        currentValue.substring(replaceTo);
      newCursorPos = replaceFrom + suggestion.value.length;
    }

    const syntheticEvent = {
      target: {
        value: newValue,
        selectionStart: newCursorPos,
        selectionEnd: newCursorPos
      }
    } as React.ChangeEvent<HTMLInputElement>;

    if (onChange) {
      onChange(syntheticEvent);
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
      }
    }, 0);

    setShowSuggestions(false);
  };

  const removeTemplate = (templateContent: string) => {
    const currentValue = value !== undefined ? value : defaultValue || "";
    const newValue = currentValue.replace(templateContent, "");

    const syntheticEvent = {
      target: {
        value: newValue,
        selectionStart: newValue.length,
        selectionEnd: newValue.length
      }
    } as React.ChangeEvent<HTMLInputElement>;

    if (onChange) {
      onChange(syntheticEvent);
    }
  };

  const editTemplate = (index: number) => {
    setIsEditing(true);
    setTimeout(() => {
      if (inputRef.current) {
        const segment = segments[index];
        inputRef.current.focus();
        inputRef.current.setSelectionRange(segment.start, segment.end);
      }
    }, 0);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsEditing(true);
    const target = e.target as HTMLInputElement;
    updateSuggestions(target.value, target.selectionStart || 0);
  };

  const handleBlur = () => {
    const hasTemplates = segments.some((s) => s.type === "template");
    setTimeout(() => {
      if (hasTemplates && !showSuggestions) {
        setIsEditing(false);
      }
    }, 200);
  };

  const isControlled = value !== undefined;
  const hasTemplates = segments.some((s) => s.type === "template");
  const showBadgeView = hasTemplates && !isEditing;

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          <span className="text-xs text-gray-500 ml-2">
            (Use {"{{"}nodeId.output{"}}"} or {"{{"}state.nodeId.output{"}}"} for
            templates)
          </span>
        </label>
      )}
      <div className="relative">
        <TemplateFieldView
          segments={segments}
          displayValue={displayValue}
          placeholder={placeholder}
          fieldRef={inputRef}
          fieldType="input"
          inputType={type}
          isControlled={isControlled}
          value={value}
          defaultValue={defaultValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onRemoveTemplate={removeTemplate}
          onEditTemplate={editTemplate}
          isEditing={isEditing}
          showBadgeView={showBadgeView}
          className={className}
        />
        {showSuggestions && (
          <TemplateSuggestions
            suggestions={suggestions}
            onSelect={insertSuggestion}
            suggestionsRef={suggestionsRef}
          />
        )}
      </div>
    </div>
  );
}
