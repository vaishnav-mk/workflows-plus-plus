'use client';

import React from 'react';
import { SettingField } from '@/components/settings/NodeSettingsConfigs';
import { ConditionalBuilder } from '@/components/settings/ConditionalBuilder';
import { ConditionalRouterBuilder } from '@/components/settings/ConditionalRouterBuilder';
import { SettingCard } from '@/components/ui/SettingCard';
import { SettingInput } from '@/components/ui/SettingInput';
import { TemplateInput } from '@/components/ui/TemplateInput';
import { SettingSelect } from '@/components/ui/SettingSelect';
import { SettingTextarea } from '@/components/ui/SettingTextarea';
import { SettingButton } from '@/components/ui/SettingButton';
import { SettingText } from '@/components/ui/SettingText';

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
    
    // Check conditional rendering
    if (field.conditional) {
      const parentValue = getNestedValue(field.conditional.parentKey, null);
      // If showWhen is true, show when parent has any value
      if (field.conditional.showWhen === true) {
        if (!parentValue || parentValue === '') {
          return null;
        }
      } else if (parentValue !== field.conditional.showWhen) {
        return null;
      }
    }
    
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
        const cardTitle = field.label || field.children?.find(c => c.key === 'title')?.props?.children || 'Configuration';
        const nodeType = nodeData?.type || 'default';
        const isNested = field.key.includes('-container') && field.key !== `${nodeType}-card`;
        const description = field.children?.find(c => c.key === 'description')?.props?.children;
        
        return (
          <div key={key} className={isNested ? 'mt-6' : ''}>
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {cardTitle}
              </h3>
              {description && (
                <p className="text-sm text-gray-500">{description}</p>
              )}
            </div>
            <div className="space-y-4 pl-0">
              {field.children?.filter(child => child.key !== 'title' && child.key !== 'description').map((child, childIndex) => 
                renderField(child, childIndex)
              )}
            </div>
          </div>
        );

      case 'input':
        // Use TemplateInput for string inputs to enable autofill
        if (field.props?.type !== 'number' && field.props?.type !== 'email' && field.props?.type !== 'password') {
          return (
            <div key={key} className={`settings-field-group ${field.conditional ? 'settings-conditional-field' : ''}`}>
              <label className={`settings-field-label ${field.required ? 'required' : ''}`}>
                {field.label}
              </label>
              {field.description && (
                <p className="settings-field-description">{field.description}</p>
              )}
              <TemplateInput
                label=""
                placeholder={field.placeholder}
                type={field.props?.type || 'text'}
                value={stringValue || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const newValue = e.target.value;
                  handleFieldChange(field.key, newValue);
                }}
                className={field.props?.className}
                nodeId={nodeId}
              />
            </div>
          );
        }
        return (
          <div key={key} className={`settings-field-group ${field.conditional ? 'settings-conditional-field' : ''}`}>
            <label className={`settings-field-label ${field.required ? 'required' : ''}`}>
              {field.label}
            </label>
            {field.description && (
              <p className="settings-field-description">{field.description}</p>
            )}
            <SettingInput
              label=""
              placeholder={field.placeholder}
              type={field.props?.type || 'text'}
              value={stringValue || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newValue = e.target.value;
                handleFieldChange(field.key, newValue);
              }}
              className={field.props?.className}
            />
          </div>
        );

      case 'select':
        return (
          <div key={key} className={`space-y-1.5 ${field.conditional ? 'settings-conditional-field' : ''}`}>
            <label className={`block text-sm font-medium text-gray-700 ${field.required ? 'required' : ''}`}>
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
                handleFieldChange(field.key, e.target.value);
                // If this is a type field that affects other fields, trigger re-render
                if (field.key.endsWith('.type')) {
                  // Force update to show/hide conditional fields
                  onNodeUpdate(nodeId, { config: { ...nodeData.config } });
                }
              }}
              className={`settings-enum-select ${field.props?.className || ''}`}
            />
          </div>
        );

      case 'textarea':
        // For textareas that might contain code/queries, also support templates
        // Handle JSON objects specially
        const isJsonObject = field.key.includes('.content') || field.key.endsWith('content');
        let displayValue = stringValue;
        if (isJsonObject && typeof currentValue === 'object' && currentValue !== null) {
          try {
            displayValue = JSON.stringify(currentValue, null, 2);
          } catch {
            displayValue = stringValue;
          }
        }
        
        return (
          <div key={key} className={`space-y-1.5 ${field.conditional ? 'settings-conditional-field' : ''}`}>
            <label className={`block text-sm font-medium text-gray-700 ${field.required ? 'required' : ''}`}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-1">{field.description}</p>
            )}
            <SettingTextarea
              label=""
              placeholder={field.placeholder || (isJsonObject ? 'Enter JSON object' : '')}
              value={displayValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                let value = e.target.value;
                // Try to parse JSON if it's a content field
                if (isJsonObject) {
                  try {
                    value = JSON.parse(e.target.value);
                  } catch {
                    // Keep as string if invalid JSON
                  }
                }
                handleFieldChange(field.key, value);
              }}
              className={field.props?.className || (isJsonObject ? 'settings-object-input' : '')}
            />
            {!isJsonObject && (
              <p className="text-xs text-gray-500 mt-1">
                Tip: Use {'{{'}nodeId.output{'}}'} or {'{{'}state.nodeId.output{'}}'} to reference other nodes
              </p>
            )}
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

      case 'conditional-router-builder':
        return (
          <ConditionalRouterBuilder
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
    <div className="space-y-6">
      {fields.map((field, index) => renderField(field, index))}
    </div>
  );
}