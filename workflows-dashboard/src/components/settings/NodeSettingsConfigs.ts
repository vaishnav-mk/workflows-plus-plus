import { useState, useEffect } from 'react';
import { useNodeRegistry } from '@/hooks/useNodeRegistry';
import type { SettingField, NodeSettingsConfig } from '@/types/settings';

export type { SettingField, NodeSettingsConfig };

interface JSONSchema {
  type?: string;
  properties?: Record<string, any>;
  enum?: any[];
  default?: any;
  description?: string;
  min?: number;
  max?: number;
  format?: string;
  required?: string[];
}

// Convert JSON Schema to SettingField array
function generateSettingsFromSchema(
  schema: any,
  nodeType: string,
  metadata: { name: string; description: string }
): SettingField[] {
  const fields: SettingField[] = [];

  // Validate schema structure
  if (!schema || typeof schema !== 'object') {
    console.warn(`[NodeSettingsConfigs] Invalid schema for ${nodeType}:`, schema);
    return DEFAULT_CONFIG;
  }

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

function generateFieldsFromSchema(schema: JSONSchema, prefix = '', requiredFields: string[] = []): SettingField[] {
  if (!schema.properties) return [];

  const fields: SettingField[] = [];
  const schemaRequired = (schema.required as string[]) || [];

  Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const isRequired = schemaRequired.includes(key) || requiredFields.includes(fullKey);
    
    // Handle nested objects recursively
    if (prop.type === 'object') {
      if (prop.properties) {
        // Object with defined properties - create a card/section
        fields.push({
          type: "card",
          key: `${fullKey}-container`,
          label: prop.title || formatLabel(key),
          children: generateFieldsFromSchema(prop, fullKey, schemaRequired.map((r: string) => `${fullKey}.${r}`))
        });
      } else {
        // Object without properties (like value.content) - treat as JSON input
        const field: SettingField = {
          type: "textarea",
          key: fullKey,
          label: prop.title || formatLabel(key),
          placeholder: prop.description || "Enter JSON object",
          defaultValue: prop.default,
          required: isRequired,
          description: prop.description,
          props: {
            className: "settings-object-input"
          }
        };
        fields.push(field);
      }
    } else {
      // Handle regular fields
      const field: SettingField = {
        type: getFieldType(prop),
        key: fullKey,
        label: prop.title || formatLabel(key),
        placeholder: prop.description || "",
        defaultValue: prop.default,
        required: isRequired,
        description: prop.description,
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

      // Handle conditional rendering for nested fields
      // If this field is inside a parent object that has a type field, check if we should conditionally show it
      if (prefix && key === 'content') {
        // This is a content field - show it when type is set
        field.conditional = {
          parentKey: prefix + '.type',
          showWhen: true // Show when type is set (not empty)
        };
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
  const { catalog, getNodeByType } = useNodeRegistry();
  const [configs, setConfigs] = useState<NodeSettingsConfig>({});

  useEffect(() => {
    const catalogLength = catalog.length;
    console.log(`[NodeSettingsConfigs] Effect triggered. Catalog length: ${catalogLength}`);
    
    if (catalogLength === 0) {
      console.log(`[NodeSettingsConfigs] Catalog is empty, skipping load`);
      return;
    }

    const loadConfigs = async () => {
      console.log(`[NodeSettingsConfigs] Loading configs for ${catalogLength} node types`);
      const nodeTypes = catalog.map(item => item.type);
      console.log(`[NodeSettingsConfigs] Catalog items:`, nodeTypes);
      
      const settingsConfig: NodeSettingsConfig = {};

      // Load node definitions for all catalog items
      for (const catalogItem of catalog) {
        try {
          console.log(`[NodeSettingsConfigs] Fetching: ${catalogItem.type}`);
          const nodeDef = await getNodeByType(catalogItem.type);
          if (nodeDef) {
            console.log(`[NodeSettingsConfigs] Loaded: ${catalogItem.type}`, {
              hasSchema: !!nodeDef.configSchema,
              schemaType: typeof nodeDef.configSchema,
              schemaKeys: nodeDef.configSchema ? Object.keys(nodeDef.configSchema) : []
            });
            
            if (!nodeDef.configSchema) {
              console.warn(`[NodeSettingsConfigs] No configSchema for ${catalogItem.type}`);
              continue;
            }
            
            const fields = generateSettingsFromSchema(
              nodeDef.configSchema,
              nodeDef.metadata.type,
              nodeDef.metadata
            );
            console.log(`[NodeSettingsConfigs] Generated ${fields.length} fields for ${catalogItem.type}`);
            settingsConfig[nodeDef.metadata.type] = fields;
          } else {
            console.warn(`[NodeSettingsConfigs] No definition: ${catalogItem.type}`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[NodeSettingsConfigs] Failed: ${catalogItem.type} - ${errorMsg}`);
        }
      }
      
      const configCount = Object.keys(settingsConfig).length;
      console.log(`[NodeSettingsConfigs] Loaded ${configCount} configs`);
      setConfigs(settingsConfig);
    };

    if (catalog.length > 0) {
      loadConfigs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  // Always add fallback default config
  return { ...configs, default: DEFAULT_CONFIG };
}
