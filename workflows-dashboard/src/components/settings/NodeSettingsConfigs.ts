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
  metadata: { name: string; description: string; type?: string }
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
      ...generateFieldsFromSchema(schema, '', [], nodeType)
    ]
  });

  return fields;
}

function generateFieldsFromSchema(schema: JSONSchema, prefix = '', requiredFields: string[] = [], nodeType?: string): SettingField[] {
  if (!schema.properties) return [];

  const fields: SettingField[] = [];
  const schemaRequired = (schema.required as string[]) || [];

  // Special handling for conditional-router: use custom builder
  if (nodeType === 'conditional-router' && !prefix) {
    // Check if this schema has conditionPath and cases
    if (schema.properties.conditionPath && schema.properties.cases) {
      fields.push({
        type: 'conditional-router-builder',
        key: 'conditional-router-config',
      });
      return fields;
    }
  }

  // Special handling for d1-query: use D1 database selector
  if (nodeType === 'd1-query' && !prefix) {
    // Check if this schema has database field
    if (schema.properties.database) {
      fields.push({
        type: 'd1-database-selector',
        key: 'd1-database-config',
      });
      // Still generate other fields (query, params, etc.)
      // Remove database from properties to avoid duplicate
      const { database, ...otherProps } = schema.properties;
      const otherFields = generateFieldsFromSchema(
        { ...schema, properties: otherProps },
        prefix,
        requiredFields.filter(r => r !== 'database'),
        nodeType
      );
      return [...fields, ...otherFields];
    }
  }

  // Special handling for transform node: use custom transform settings component
  if (nodeType === 'transform' && !prefix) {
    // Check if this schema has code field
    if (schema.properties.code) {
      fields.push({
        type: 'transform-node-settings',
        key: 'transform-config',
      });
      return fields;
    }
  }

  // Special handling for KV nodes: use KV namespace selector
  if ((nodeType === 'kv_get' || nodeType === 'kv_put') && !prefix) {
    // Check if this schema has namespace field with binding:kv description
    const namespaceProp = schema.properties.namespace;
    if (namespaceProp) {
      const description = typeof namespaceProp === 'object' 
        ? (namespaceProp.description || namespaceProp.title || '')
        : '';
      if (typeof description === 'string' && description.includes('binding:kv')) {
        fields.push({
          type: 'kv-namespace-selector',
          key: 'kv-namespace-config',
        });
        // Still generate other fields (key, value, etc.)
        // Remove namespace from properties to avoid duplicate
        const { namespace, ...otherProps } = schema.properties;
        const otherFields = generateFieldsFromSchema(
          { ...schema, properties: otherProps },
          prefix,
          requiredFields.filter(r => r !== 'namespace'),
          nodeType
        );
        return [...fields, ...otherFields];
      }
    }
  }

  // Special handling for R2 nodes: use R2 bucket selector
  if ((nodeType === 'r2-get' || nodeType === 'r2-put' || nodeType === 'r2-list') && !prefix) {
    // Check if this schema has bucket field with binding:r2 description
    const bucketProp = schema.properties.bucket;
    if (bucketProp) {
      const description = typeof bucketProp === 'object' 
        ? (bucketProp.description || bucketProp.title || '')
        : '';
      if (typeof description === 'string' && description.includes('binding:r2')) {
        fields.push({
          type: 'r2-bucket-selector',
          key: 'r2-bucket-config',
        });
        // Still generate other fields (key, value, etc.)
        // Remove bucket from properties to avoid duplicate
        const { bucket, ...otherProps } = schema.properties;
        const otherFields = generateFieldsFromSchema(
          { ...schema, properties: otherProps },
          prefix,
          requiredFields.filter(r => r !== 'bucket'),
          nodeType
        );
        return [...fields, ...otherFields];
      }
    }
  }

  // Process all properties
  Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const isRequired = schemaRequired.includes(key) || requiredFields.includes(fullKey);
    
    // CRITICAL: Handle content fields FIRST, before any other processing
    // Content fields are always textareas - they should ALWAYS be visible
    // We removed the conditional because the field should always be available
    if (key === 'content' && prefix) {
      console.log(`[NodeSettingsConfigs] Processing content field: key=${key}, prefix=${prefix}, fullKey=${fullKey}`);
      console.log(`[NodeSettingsConfigs] Content prop:`, prop);
      const contentField: SettingField = {
        type: "textarea",
        key: fullKey,
        label: prop.title || formatLabel(key) || "Content",
        placeholder: prop.description || "Enter JSON object or expression",
        defaultValue: prop.default,
        required: isRequired,
        description: prop.description || "The content to store in KV",
        props: {
          className: "settings-object-input",
          style: { height: '96px' }
        }
        // REMOVED conditional - field should always be visible
      };
      console.log(`[NodeSettingsConfigs] Created content field:`, contentField);
      fields.push(contentField);
      return; // Skip to next property - this prevents content from being processed as a regular field
    }
    
    // Handle nested objects recursively
    if (prop.type === 'object' || (!prop.type && prop.properties)) {
      if (prop.properties) {
        // Object with defined properties - create a card/section
        // Recursively process children - this will handle content fields inside
        const children = generateFieldsFromSchema(prop, fullKey, schemaRequired.map((r: string) => `${fullKey}.${r}`), nodeType);
        fields.push({
          type: "card",
          key: `${fullKey}-container`,
          label: prop.title || formatLabel(key),
          children: children
        });
      } else {
        // Object without properties - treat as JSON input
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
      // Handle regular fields (strings, numbers, enums, etc.)
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

      // CRITICAL FALLBACK: If content field wasn't caught earlier (shouldn't happen, but safety net)
      // This handles cases where content might not have been processed correctly
      if (prefix && key === 'content') {
        field.conditional = {
          parentKey: prefix + '.type',
          showWhen: true
        };
        field.type = 'textarea';
        if (!field.props) {
          field.props = {};
        }
        field.props.className = "settings-object-input";
        field.props.style = { height: '96px' };
        if (!field.placeholder) {
          field.placeholder = "Enter JSON object or expression";
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

  // For fields without a type (like z.any()), default to textarea if it's a content field
  // This will be overridden by the conditional logic if needed
  if (!prop.type || prop.type === 'any') {
    return 'textarea';
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
