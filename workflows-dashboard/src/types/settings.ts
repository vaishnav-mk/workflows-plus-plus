export interface SettingField {
  type:
    | "input"
    | "select"
    | "textarea"
    | "button"
    | "card"
    | "text"
    | "conditional-builder"
    | "conditional-router-builder"
    | "d1-database-selector"
    | "kv-namespace-selector"
    | "r2-bucket-selector"
    | "ai-search-selector"
    | "ai-model-select"
    | "transform-node-settings";
  key: string;
  label?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  props?: any;
  children?: SettingField[];
  required?: boolean;
  conditional?: {
    parentKey: string;
    showWhen: any;
  };
  description?: string;
}

export interface NodeSettingsConfig {
  [nodeType: string]: SettingField[];
}
