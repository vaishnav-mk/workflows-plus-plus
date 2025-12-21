"use client";

import { TemplateBadge } from "./TemplateBadge";
import type { TemplateSegment } from "@/types/template";

interface TemplateFieldViewProps {
  segments: TemplateSegment[];
  displayValue: string;
  placeholder?: string;
  fieldRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  fieldType: "input" | "textarea";
  inputType?: string;
  isControlled: boolean;
  value?: string;
  defaultValue?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: () => void;
  onRemoveTemplate: (templateContent: string) => void;
  onEditTemplate: (index: number) => void;
  isEditing: boolean;
  showBadgeView: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function TemplateFieldView({
  segments,
  displayValue,
  placeholder,
  fieldRef,
  fieldType,
  inputType = "text",
  isControlled,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  onRemoveTemplate,
  onEditTemplate,
  isEditing,
  showBadgeView,
  className,
  style
}: TemplateFieldViewProps) {
  const isTextarea = fieldType === "textarea";
  const minHeight = isTextarea ? "min-h-[8rem]" : "min-h-[2.5rem]";
  const itemsClass = isTextarea ? "items-start" : "items-center";

  if (showBadgeView) {
    return (
      <div
        className={`w-full ${minHeight} px-3 py-2 text-sm border border-gray-300 rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white flex flex-wrap ${itemsClass} gap-2 cursor-text`}
        onClick={() => {
          setTimeout(() => {
            if (fieldRef.current) {
              fieldRef.current.focus();
              if (fieldRef.current instanceof HTMLInputElement || fieldRef.current instanceof HTMLTextAreaElement) {
                const len = displayValue.length;
                fieldRef.current.setSelectionRange(len, len);
              }
            }
          }, 0);
        }}
      >
        {segments.map((segment, index) => {
          if (segment.type === "template") {
            return (
              <TemplateBadge
                key={index}
                expression={segment.content}
                onRemove={() => onRemoveTemplate(segment.content)}
                onClick={() => onEditTemplate(index)}
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
        {!displayValue && <span className="text-gray-400">{placeholder}</span>}
        {isTextarea ? (
          <textarea
            ref={fieldRef as React.RefObject<HTMLTextAreaElement>}
            placeholder={placeholder}
            {...(isControlled ? { value: displayValue } : { defaultValue })}
            onChange={onChange as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
            onFocus={onFocus as (e: React.FocusEvent<HTMLTextAreaElement>) => void}
            onBlur={onBlur}
            className={
              isEditing
                ? "absolute inset-0 w-full h-full px-3 py-2 text-sm border-0 outline-none bg-transparent resize-none"
                : "absolute inset-0 opacity-0 pointer-events-auto resize-none"
            }
            style={{ zIndex: isEditing ? 10 : 1, ...style }}
          />
        ) : (
          <input
            ref={fieldRef as React.RefObject<HTMLInputElement>}
            type={inputType}
            placeholder={placeholder}
            {...(isControlled ? { value: displayValue } : { defaultValue })}
            onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
            onFocus={onFocus as (e: React.FocusEvent<HTMLInputElement>) => void}
            onBlur={onBlur}
            className={
              isEditing
                ? "absolute inset-0 w-full h-full px-3 py-2 text-sm border-0 outline-none bg-transparent"
                : "absolute inset-0 opacity-0 pointer-events-auto"
            }
            style={{ zIndex: isEditing ? 10 : 1 }}
          />
        )}
      </div>
    );
  }

  const baseClassName = className ||
    `w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isTextarea ? "resize-none" : ""}`;

  return (
    <>
      {isTextarea ? (
        <textarea
          ref={fieldRef as React.RefObject<HTMLTextAreaElement>}
          placeholder={placeholder}
          {...(isControlled ? { value: displayValue } : { defaultValue })}
          onChange={onChange as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
          onFocus={onFocus as (e: React.FocusEvent<HTMLTextAreaElement>) => void}
          onBlur={onBlur}
          className={baseClassName}
          style={style}
        />
      ) : (
        <input
          ref={fieldRef as React.RefObject<HTMLInputElement>}
          type={inputType}
          placeholder={placeholder}
          {...(isControlled ? { value: displayValue } : { defaultValue })}
          onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
          onFocus={onFocus as (e: React.FocusEvent<HTMLInputElement>) => void}
          onBlur={onBlur}
          className={baseClassName}
        />
      )}
      {segments.some((s) => s.type === "template") && segments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {segments.map((segment, index) => {
            if (segment.type === "template") {
              return (
                <TemplateBadge
                  key={index}
                  expression={segment.content}
                  onRemove={() => onRemoveTemplate(segment.content)}
                  onClick={() => onEditTemplate(index)}
                />
              );
            }
            return null;
          })}
        </div>
      )}
    </>
  );
}

