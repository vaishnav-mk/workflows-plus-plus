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

function generateSettingsFromSchema(
  schema: any,
  nodeType: string,
  metadata: { name: string; description: string; type?: string }
): SettingField[] {
  const fields: SettingField[] = [];

  if (!schema || typeof schema !== 'object') {
    return DEFAULT_CONFIG;
  }

  const configFields = generateFieldsFromSchema(schema, '', [], nodeType);
  
  if (configFields.length === 0) {
    return DEFAULT_CONFIG;
  }

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
      ...configFields
    ]
  });

  return fields;
}

function generateFieldsFromSchema(schema: JSONSchema, prefix = '', requiredFields: string[] = [], nodeType?: string): SettingField[] {
  if (!schema || !schema.properties) {
    return [];
  }

  const fields: SettingField[] = [];
  const schemaRequired = (schema.required as string[]) || [];

  if (nodeType === 'conditional-router' && !prefix) {
    if (schema.properties.conditionPath && schema.properties.cases) {
      fields.push({
        type: 'conditional-router-builder',
        key: 'conditional-router-config',
      });
      return fields;
    }
  }

  if (nodeType === 'd1-query' && !prefix) {
    if (schema.properties.database) {
      fields.push({
        type: 'd1-database-selector',
        key: 'd1-database-config',
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { database: _database, ...otherProps } = schema.properties;
      const otherFields = generateFieldsFromSchema(
        { ...schema, properties: otherProps },
        prefix,
        requiredFields.filter(r => r !== 'database'),
        nodeType
      );
      return [...fields, ...otherFields];
    }
  }

  if (nodeType === 'transform' && !prefix) {
    if (schema.properties.code) {
      fields.push({
        type: 'transform-node-settings',
        key: 'transform-config',
      });
      return fields;
    }
  }

  if (nodeType === 'ai-search' && !prefix) {
    if (schema.properties.autoragName) {
      fields.push({
        type: 'ai-search-selector',
        key: 'ai-search-config',
      });
      const { autoragName: _autoragName, ...otherProps } = schema.properties;
      const otherFields = generateFieldsFromSchema(
        { ...schema, properties: otherProps },
        prefix,
        requiredFields.filter(r => r !== 'autoragName'),
        nodeType
      );
      return [...fields, ...otherFields];
    }
  }

  if ((nodeType === 'kv-get' || nodeType === 'kv-put') && !prefix) {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { namespace: _namespace, key: _key, ...otherProps } = schema.properties;
        const otherFields = generateFieldsFromSchema(
          { ...schema, properties: otherProps },
          prefix,
          requiredFields.filter(r => r !== 'namespace' && r !== 'key'),
          nodeType
        );
        return [...fields, ...otherFields];
      }
    }
  }

  if ((nodeType === 'r2-get' || nodeType === 'r2-put' || nodeType === 'r2-list') && !prefix) {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { bucket: _bucket, ...otherProps } = schema.properties;
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

  Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const isRequired = schemaRequired.includes(key) || requiredFields.includes(fullKey);
    
    if (key === 'content' && prefix) {
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
      };
      fields.push(contentField);
      return;
    }
    
    if (prop.type === 'object' || (!prop.type && prop.properties)) {
      if (prop.properties) {
        const children = generateFieldsFromSchema(prop, fullKey, schemaRequired.map((r: string) => `${fullKey}.${r}`), nodeType);
        fields.push({
          type: "card",
          key: `${fullKey}-container`,
          label: prop.title || formatLabel(key),
          children: children
        });
      } else {
        const field: SettingField = {
          type: "textarea",
          key: fullKey,
          label: prop.title || formatLabel(key),
          placeholder: prop.description || "Enter JSON object",
          defaultValue: prop.default,
          required: isRequired,
          description: prop.description,
          props: {
            className: "settings-object-input",
            style: { height: '96px' }
          }
        };
        fields.push(field);
      }
    } else {
      const isAIModelSearchable = typeof prop.description === 'string' && prop.description.startsWith('searchable:ai-models:');
      
      const field: SettingField = {
        type: isAIModelSearchable ? 'ai-model-select' : getFieldType(prop),
        key: fullKey,
        label: prop.title || formatLabel(key),
        placeholder: prop.description || "",
        defaultValue: prop.default,
        required: isRequired,
        description: prop.description,
      };

      if (isAIModelSearchable) {
        const task = prop.description.split(':')[2];
        field.props = { task };
      } else if (prop.enum) {
        field.options = prop.enum.map((val: any) => ({
          value: String(val),
          label: String(val)
        }));
      } else if (prop.type === 'boolean') {
        field.options = [
          { value: 'true', label: 'True' },
          { value: 'false', label: 'False' }
        ];
      }

      if (prop.type === 'number' || prop.type === 'integer') {
        field.props = { type: 'number' };
        if (prop.minimum !== undefined) field.props.min = prop.minimum;
        if (prop.maximum !== undefined) field.props.max = prop.maximum;
        if (prop.min !== undefined) field.props.min = prop.min;
        if (prop.max !== undefined) field.props.max = prop.max;
      }

      if (prop.type === 'array') {
        if (!field.props) {
          field.props = {};
        }
        field.props.className = "settings-object-input";
        field.props.style = { height: '96px' };
        if (!field.placeholder) {
          field.placeholder = "Enter JSON array, e.g., []";
        }
      }

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
  if (prop.type === 'array') {
    // Arrays should be editable as JSON in a textarea
    return 'textarea';
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
    if (prop.maxLength && prop.maxLength > 100) {
      return 'textarea';
    }
    return 'input';
  }

  if (prop.type === 'object') {
    return 'textarea';
  }

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

export function useNodeSettingsConfigs(): NodeSettingsConfig {
  const { catalog, getNodeByType } = useNodeRegistry();
  const [configs, setConfigs] = useState<NodeSettingsConfig>({});

  useEffect(() => {
    const catalogLength = catalog.length;
    
    if (catalogLength === 0) {
      return;
    }

    const loadConfigs = async () => {
      const settingsConfig: NodeSettingsConfig = {};

      for (const catalogItem of catalog) {
        try {
          const nodeDef = await getNodeByType(catalogItem.type);
          if (nodeDef) {
            if (!nodeDef.configSchema) {
              continue;
            }
            
            const fields = generateSettingsFromSchema(
              nodeDef.configSchema,
              nodeDef.metadata.type,
              nodeDef.metadata
            );
            settingsConfig[nodeDef.metadata.type] = fields;
          }
        } catch (error) {
          console.error(`[NodeSettingsConfigs] Failed to load ${catalogItem.type}:`, error);
        }
      }
      
      setConfigs(settingsConfig);
    };

    if (catalog.length > 0) {
      loadConfigs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  return { ...configs, default: DEFAULT_CONFIG };
}
