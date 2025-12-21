"use client";

import React from "react";
import { SettingField } from "@/components/settings/NodeSettingsConfigs";
import { renderFieldByType } from "./FieldRenderers";
import {
  processFieldValue,
  getNestedValue,
  convertValueToString,
  migrateNestedValue,
  buildNestedObject
} from "@/utils/settings-renderer";

interface DynamicSettingsRendererProps {
  fields: SettingField[];
  nodeData: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  nodeId: string;
}

export function DynamicSettingsRenderer({
  fields,
  nodeData,
  onNodeUpdate,
  nodeId
}: DynamicSettingsRendererProps) {
  const handleFieldChange = (key: string, value: any) => {
    const processedValue = processFieldValue(value);

    if (key.includes(".")) {
      const keys = key.split(".");
      const rootKey = keys[0];
      const nestedKeys = keys.slice(1);

      let currentNested = nodeData.config?.[rootKey];
      currentNested = migrateNestedValue(
        currentNested,
        nestedKeys,
        processedValue
      );

      buildNestedObject(currentNested, nestedKeys, processedValue);

      onNodeUpdate(nodeId, {
        config: {
          ...nodeData.config,
          [rootKey]: currentNested
        }
      });
    } else {
      onNodeUpdate(nodeId, {
        config: {
          ...nodeData.config,
          [key]: processedValue
        }
      });
    }
  };

  const renderField = (field: SettingField, index: number): React.ReactNode => {
    if (field.conditional) {
      const parentValue = getNestedValue(
        field.conditional.parentKey,
        nodeData.config,
        null
      );
      if (field.conditional.showWhen === true) {
        if (
          parentValue === null ||
          parentValue === undefined ||
          parentValue === ""
        ) {
          return null;
        }
      } else if (parentValue !== field.conditional.showWhen) {
        return null;
      }
    }

    const currentValue = getNestedValue(
      field.key,
      nodeData.config,
      field.defaultValue
    );
    const stringValue = convertValueToString(currentValue);

    return renderFieldByType({
      field,
      nodeData,
      nodeId,
      currentValue,
      stringValue,
      displayValue: stringValue,
      onFieldChange: handleFieldChange,
      onNodeUpdate
    });
  };

  return (
    <div className="space-y-6">
      {fields.map((field, index) => renderField(field, index))}
    </div>
  );
}
