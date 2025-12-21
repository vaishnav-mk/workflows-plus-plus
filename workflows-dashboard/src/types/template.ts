export interface TemplateInputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  nodeId: string;
}

export interface TemplateSegment {
  type: "text" | "template";
  content: string;
  start: number;
  end: number;
}

export interface TemplateSuggestion {
  value: string;
  display: string;
}

