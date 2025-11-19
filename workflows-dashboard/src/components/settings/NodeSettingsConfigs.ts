import { useMemo } from 'react';
import { useNodeRegistry } from '@/hooks/useNodeRegistry';

export interface SettingField {
  type:
    | "input"
    | "select"
    | "textarea"
    | "button"
    | "card"
    | "text"
    | "conditional-builder";
  key: string;
  label?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  props?: any;
  children?: SettingField[];
}

export interface NodeSettingsConfig {
  [nodeType: string]: SettingField[];
}

interface JSONSchema {
  type?: string;
  properties?: Record<string, any>;
  enum?: any[];
  default?: any;
  description?: string;
  min?: number;
  max?: number;
  format?: string;
}

// Convert JSON Schema to SettingField array
function generateSettingsFromSchema(
  schema: any,
  nodeType: string,
  metadata: { name: string; description: string }
): SettingField[] {
  const fields: SettingField[] = [];

  // Add card wrapper
  fields.push({
      type: "card",
    key: `${nodeType}-card`,
      children: [
        {
          type: "text",
          key: "title",
        props: { children: `${metadata.name} Configuration` }
        },
        {
          type: "text",
          key: "description",
          props: {
          children: metadata.description,
            className: "text-sm text-gray-500 mb-4"
          }
        },
      // Generate fields from schema properties
      ...generateFieldsFromSchema(schema)
    ]
  });

  return fields;
}

function generateFieldsFromSchema(schema: JSONSchema, prefix = ''): SettingField[] {
  if (!schema.properties) return [];

  const fields: SettingField[] = [];

  Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    // Handle nested objects recursively
    if (prop.type === 'object' && prop.properties) {
      // Create a card/section for nested objects
      fields.push({
        type: "card",
        key: `${fullKey}-container`,
        label: prop.title || formatLabel(key),
        children: generateFieldsFromSchema(prop, fullKey)
      });
    } else {
      // Handle regular fields
      const field: SettingField = {
        type: getFieldType(prop),
        key: fullKey,
        label: prop.title || formatLabel(key),
        placeholder: prop.description || "",
        defaultValue: prop.default,
      };

      // Add options for enum types
      if (prop.enum) {
        field.options = prop.enum.map((val: any) => ({
          value: String(val),
          label: String(val)
        }));
      }

      // Add type-specific props
      if (prop.type === 'number') {
        field.props = { type: 'number' };
        if (prop.min !== undefined) field.props.min = prop.min;
        if (prop.max !== undefined) field.props.max = prop.max;
      }

      // Add textarea props for long strings
      if (prop.type === 'string' && (key.includes('code') || key.includes('query') || key.includes('body'))) {
        field.props = {
          className: "w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
        };
        if (key.includes('code')) {
          field.props.style = { height: '128px' };
        } else {
          field.props.style = { height: '96px' };
        }
      }

      fields.push(field);
    }
  });

  return fields;
}

function getFieldType(prop: any): SettingField['type'] {
  if (prop.type === 'array' && prop.items?.type === 'object') {
    return 'text'; // Special handling for complex arrays
  }

  if (prop.enum) {
    return 'select';
  }

  if (prop.type === 'boolean') {
    return 'select';
  }

  if (prop.type === 'number' || prop.type === 'integer') {
    return 'input';
  }

  if (prop.type === 'string') {
    // Determine if it should be textarea based on key name or length expectations
    if (prop.maxLength && prop.maxLength > 100) {
      return 'textarea';
    }
    return 'input';
  }

  if (prop.type === 'object') {
    return 'text';
  }

  return 'input';
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Fallback default config
const DEFAULT_CONFIG: SettingField[] = [
    {
      type: "card",
      key: "default-card",
      children: [
        {
          type: "text",
          key: "title",
          props: { children: "Node Configuration" }
        },
        {
          type: "text",
          key: "description",
          props: {
            children: "Configuration options for this node type",
            className: "text-sm text-gray-500"
          }
        }
      ]
    }
];

// Hook to get node settings configs dynamically from backend
export function useNodeSettingsConfigs(): NodeSettingsConfig {
  const { nodes } = useNodeRegistry();

  const configs = useMemo(() => {
    const settingsConfig: NodeSettingsConfig = {};

    nodes.forEach(node => {
      const fields = generateSettingsFromSchema(
        node.configSchema,
        node.metadata.type,
        node.metadata
      );
      settingsConfig[node.metadata.type] = fields;
    });

    // Always add fallback default config
    settingsConfig.default = DEFAULT_CONFIG;

    return settingsConfig;
  }, [nodes]);

  return configs;
}

// Legacy static config for backward compatibility during transition
export const nodeSettingsConfigs: NodeSettingsConfig = {
  default: DEFAULT_CONFIG
};
