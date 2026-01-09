"use client";

import React from "react";
import { SettingField } from "@/components/settings/NodeSettingsConfigs";
import { ConditionalBuilder } from "@/components/settings/ConditionalBuilder";
import { ConditionalRouterBuilder } from "@/components/settings/ConditionalRouterBuilder";
import { D1DatabaseSelector } from "@/components/settings/D1DatabaseSelector";
import { KVNamespaceSelector } from "@/components/settings/KVNamespaceSelector";
import { R2BucketSelector } from "@/components/settings/R2BucketSelector";
import { TransformNodeSettings } from "@/components/settings/TransformNodeSettings";
import { SettingInput } from "@/components/ui/SettingInput";
import { TemplateInput } from "@/components/ui/TemplateInput";
import { SettingSelect } from "@/components/ui/SettingSelect";
import { SettingTextarea } from "@/components/ui/SettingTextarea";
import { TemplateTextarea } from "@/components/ui/TemplateTextarea";
import { SettingButton } from "@/components/ui/SettingButton";
import { getNestedValue, convertValueToString } from "@/utils/settings-renderer";

interface FieldRenderersProps {
  field: SettingField;
  nodeData: any;
  nodeId: string;
  currentValue: any;
  stringValue: string;
  displayValue: string;
  onFieldChange: (key: string, value: any) => void;
  onNodeUpdate: (nodeId: string, updates: any) => void;
}

export function renderFieldByType({
  field,
  nodeData,
  nodeId,
  currentValue,
  stringValue,
  displayValue,
  onFieldChange,
  onNodeUpdate
}: FieldRenderersProps): React.ReactNode {
  const key = field.key;

  switch (field.type) {
    case "card":
      const cardTitle =
        field.label ||
        field.children?.find((c) => c.key === "title")?.props?.children ||
        "Configuration";
      const nodeType = nodeData?.type || "default";
      const isNested =
        field.key.includes("-container") && field.key !== `${nodeType}-card`;
      const description = field.children?.find(
        (c) => c.key === "description"
      )?.props?.children;

      return (
        <div key={key} className={isNested ? "mt-6" : ""}>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              {cardTitle}
            </h3>
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
          <div className="space-y-4 pl-0">
            {field.children
              ?.filter(
                (child) => child.key !== "title" && child.key !== "description"
              )
              .map((child, childIndex) => {
                const childValue = getNestedValue(
                  child.key,
                  nodeData.config,
                  child.defaultValue
                );
                const childStringValue = convertValueToString(childValue);
                return renderFieldByType({
                  field: child,
                  nodeData,
                  nodeId,
                  currentValue: childValue,
                  stringValue: childStringValue,
                  displayValue: childStringValue,
                  onFieldChange,
                  onNodeUpdate
                });
              })}
          </div>
        </div>
      );

    case "input":
      if (
        field.props?.type !== "number" &&
        field.props?.type !== "email" &&
        field.props?.type !== "password"
      ) {
        return (
          <div
            key={key}
            className={`settings-field-group ${field.conditional ? "settings-conditional-field" : ""}`}
          >
            <label
              className={`settings-field-label ${field.required ? "required" : ""}`}
            >
              {field.label}
            </label>
            {field.description && (
              <p className="settings-field-description">{field.description}</p>
            )}
            <TemplateInput
              label=""
              placeholder={field.placeholder}
              type={field.props?.type || "text"}
              value={stringValue || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                onFieldChange(field.key, e.target.value);
              }}
              className={field.props?.className}
              nodeId={nodeId}
            />
          </div>
        );
      }
      return (
        <div
          key={key}
          className={`settings-field-group ${field.conditional ? "settings-conditional-field" : ""}`}
        >
          <label
            className={`settings-field-label ${field.required ? "required" : ""}`}
          >
            {field.label}
          </label>
          {field.description && (
            <p className="settings-field-description">{field.description}</p>
          )}
          <SettingInput
            label=""
            placeholder={field.placeholder}
            type={field.props?.type || "text"}
            value={stringValue || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              onFieldChange(field.key, e.target.value);
            }}
            className={field.props?.className}
          />
        </div>
      );

    case "select":
      return (
        <div
          key={key}
          className={`space-y-1.5 ${field.conditional ? "settings-conditional-field" : ""}`}
        >
          <label
            className={`block text-sm font-medium text-gray-700 ${field.required ? "required" : ""}`}
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.description && (
            <p className="text-xs text-gray-500 mb-1">{field.description}</p>
          )}
          <SettingSelect
            label=""
            options={field.options || []}
            value={currentValue}
            onChange={(e: any) => {
              onFieldChange(field.key, e.target.value);
              if (field.key.endsWith(".type")) {
                setTimeout(() => {
                  onNodeUpdate(nodeId, { config: { ...nodeData.config } });
                }, 0);
              }
            }}
            className={`settings-enum-select ${field.props?.className || ""}`}
          />
        </div>
      );

    case "textarea":
      const isJsonObject =
        field.key.includes(".content") || field.key.endsWith("content");
      let textareaDisplayValue = displayValue;

      if (field.key === "value.content") {
        const valueObj = nodeData.config?.value;
        if (typeof valueObj === "string") {
          textareaDisplayValue = valueObj;
        } else if (typeof currentValue === "object" && currentValue !== null) {
          try {
            textareaDisplayValue = JSON.stringify(currentValue, null, 2);
          } catch {
            textareaDisplayValue = stringValue;
          }
        }
      } else if (
        isJsonObject &&
        typeof currentValue === "object" &&
        currentValue !== null
      ) {
        try {
          textareaDisplayValue = JSON.stringify(currentValue, null, 2);
        } catch {
          textareaDisplayValue = stringValue;
        }
      }

      return (
        <div
          key={key}
          className={`space-y-1.5 ${field.conditional ? "settings-conditional-field" : ""}`}
        >
          <label
            className={`block text-sm font-medium text-gray-700 ${field.required ? "required" : ""}`}
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.description && (
            <p className="text-xs text-gray-500 mb-1">{field.description}</p>
          )}
          {(field.key.includes(".content") ||
          (field.key.includes("key") && !nodeData?.type?.includes("kv")) ||
          field.key.includes("query")) ? (
            <TemplateTextarea
              label=""
              placeholder={
                field.placeholder || (isJsonObject ? "Enter JSON object" : "")
              }
              value={textareaDisplayValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                let value = e.target.value;
                if (isJsonObject) {
                  try {
                    value = JSON.parse(e.target.value);
                  } catch {}
                }
                onFieldChange(field.key, value);
              }}
              className={
                field.props?.className ||
                (isJsonObject ? "settings-object-input" : "")
              }
              nodeId={nodeId}
              style={field.props?.style}
            />
          ) : (
            <SettingTextarea
              label=""
              placeholder={
                field.placeholder || (isJsonObject ? "Enter JSON object" : "")
              }
              value={textareaDisplayValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                let value = e.target.value;
                if (isJsonObject) {
                  try {
                    value = JSON.parse(e.target.value);
                  } catch {}
                }
                onFieldChange(field.key, value);
              }}
              className={
                field.props?.className ||
                (isJsonObject ? "settings-object-input" : "")
              }
            />
          )}
          {!isJsonObject && (
            <p className="text-xs text-gray-500 mt-1">
              Tip: Use {"{{"}nodeId.output{"}}"} or {"{{"}state.nodeId.output{"}}"} to
              reference other nodes
            </p>
          )}
        </div>
      );

    case "button":
      return (
        <SettingButton
          key={key}
          comingSoon
          className={field.props?.className}
        >
          {field.props?.children || "Button"}
        </SettingButton>
      );

    case "text":
      return (
        <div key={key} className={field.props?.className || ""}>
          {field.props?.children}
        </div>
      );

    case "conditional-builder":
      return (
        <ConditionalBuilder
          key={key}
          nodeData={nodeData}
          onNodeUpdate={onNodeUpdate}
          nodeId={nodeId}
        />
      );

    case "conditional-router-builder":
      return (
        <ConditionalRouterBuilder
          key={key}
          nodeData={nodeData}
          onNodeUpdate={onNodeUpdate}
          nodeId={nodeId}
        />
      );

    case "d1-database-selector":
      return (
        <D1DatabaseSelector
          key={key}
          nodeData={nodeData}
          onNodeUpdate={onNodeUpdate}
          nodeId={nodeId}
        />
      );

    case "kv-namespace-selector":
      return (
        <KVNamespaceSelector
          key={key}
          nodeData={nodeData}
          onNodeUpdate={onNodeUpdate}
          nodeId={nodeId}
        />
      );

    case "r2-bucket-selector":
      return (
        <R2BucketSelector
          key={key}
          nodeData={nodeData}
          onNodeUpdate={onNodeUpdate}
          nodeId={nodeId}
        />
      );

    case "transform-node-settings":
      return (
        <TransformNodeSettings
          key={key}
          nodeData={nodeData}
          onNodeUpdate={onNodeUpdate}
          nodeId={nodeId}
        />
      );

    default:
      return null;
  }
}

