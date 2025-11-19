'use client';

import React from 'react';
import { SettingField } from './NodeSettingsConfigs';
import { ConditionalBuilder } from './ConditionalBuilder';
import { SettingCard } from '../ui/SettingCard';
import { SettingInput } from '../ui/SettingInput';
import { TemplateInput } from '../ui/TemplateInput';
import { SettingSelect } from '../ui/SettingSelect';
import { SettingTextarea } from '../ui/SettingTextarea';
import { SettingButton } from '../ui/SettingButton';
import { SettingText } from '../ui/SettingText';

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
    // Handle number inputs properly
    let processedValue = value;
    if (typeof value === 'string' && !isNaN(Number(value)) && value !== '') {
      processedValue = Number(value);
    }
    
    // Handle nested keys (dot notation like "value.type" or "value.content")
    if (key.includes('.')) {
      const keys = key.split('.');
      const rootKey = keys[0];
      const nestedKeys = keys.slice(1);
      
      // Get current nested object or create new one
      const currentNested = nodeData.config?.[rootKey] || {};
      
      // Build nested object path
      let nestedObj = currentNested;
      for (let i = 0; i < nestedKeys.length - 1; i++) {
        if (!nestedObj[nestedKeys[i]]) {
          nestedObj[nestedKeys[i]] = {};
        }
        nestedObj = nestedObj[nestedKeys[i]];
      }
      
      // Set the final value
      const finalKey = nestedKeys[nestedKeys.length - 1];
      nestedObj[finalKey] = processedValue;
      
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
    const key = `${field.key}-${index}`;
    
    // Handle nested keys (dot notation)
    const getNestedValue = (keyPath: string, defaultValue: any) => {
      if (keyPath.includes('.')) {
        const keys = keyPath.split('.');
        let value = nodeData.config;
        for (const k of keys) {
          value = value?.[k];
          if (value === undefined || value === null) {
            return defaultValue;
          }
        }
        return value;
      }
      return nodeData.config?.[keyPath] ?? defaultValue;
    };
    
    const currentValue = getNestedValue(field.key, field.defaultValue);
    
    // Convert to string for input fields to avoid object parsing issues
    const stringValue = (() => {
      if (currentValue === undefined || currentValue === null) return '';
      if (typeof currentValue === 'string') return currentValue;
      if (typeof currentValue === 'number') return String(currentValue);
      if (typeof currentValue === 'boolean') return String(currentValue);
      if (typeof currentValue === 'object') {
        // For objects, try to extract a meaningful string value
        if (currentValue.label) return String(currentValue.label);
        if (currentValue.name) return String(currentValue.name);
        if (currentValue.value) return String(currentValue.value);
        if (currentValue.text) return String(currentValue.text);
        // If it's an array, join it
        if (Array.isArray(currentValue)) return currentValue.join(', ');
        return '';
      }
      return String(currentValue);
    })();

    switch (field.type) {
      case 'card':
        // Use label if available (for nested object sections), otherwise check for title child
        const cardTitle = field.label || field.children?.find(c => c.key === 'title')?.props?.children || 'Node Configuration';
        return (
          <SettingCard
            key={key}
            title={cardTitle}
          >
            {field.children?.map((child, childIndex) => 
              renderField(child, childIndex)
            )}
          </SettingCard>
        );

      case 'input':
        // Use TemplateInput for string inputs to enable autofill
        if (field.props?.type !== 'number' && field.props?.type !== 'email' && field.props?.type !== 'password') {
          return (
            <TemplateInput
              key={key}
              label={field.label}
              placeholder={field.placeholder}
              type={field.props?.type || 'text'}
              value={stringValue || ''}
              onChange={(e: any) => handleFieldChange(field.key, e.target.value)}
              className={field.props?.className}
              nodeId={nodeId}
            />
          );
        }
        return (
          <SettingInput
            key={key}
            label={field.label}
            placeholder={field.placeholder}
            type={field.props?.type || 'text'}
            value={stringValue || ''}
            onChange={(e: any) => handleFieldChange(field.key, e.target.value)}
            className={field.props?.className}
          />
        );

      case 'select':
        return (
          <SettingSelect
            key={key}
            label={field.label}
            options={field.options || []}
            value={currentValue}
            onChange={(e: any) => handleFieldChange(field.key, e.target.value)}
            className={field.props?.className}
          />
        );

      case 'textarea':
        // For textareas that might contain code/queries, also support templates
        return (
          <div className="space-y-2">
            <SettingTextarea
              key={key}
              label={field.label}
              placeholder={field.placeholder}
              value={stringValue}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className={field.props?.className}
            />
            <p className="text-xs text-gray-500">
              Tip: Use {'{{'}nodeId.output{'}}'} or {'{{'}state.nodeId.output{'}}'} to reference other nodes
            </p>
          </div>
        );

      case 'button':
        return (
          <SettingButton
            key={key}
            onClick={() => {
            }}
            className={field.props?.className}
          >
            {field.props?.children || 'Button'}
          </SettingButton>
        );

      case 'text':
        return (
          <SettingText
            key={key}
            className={field.props?.className || ""}
          >
            {field.props?.children}
          </SettingText>
        );

      case 'conditional-builder':
        return (
          <ConditionalBuilder
            key={key}
            nodeData={nodeData}
            onNodeUpdate={onNodeUpdate}
            nodeId={nodeId}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {fields.map((field, index) => renderField(field, index))}
    </div>
  );
}