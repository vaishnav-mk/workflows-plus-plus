// Re-export all types from workflow and components
export * from "./workflow";
export * from "./components";
export * from "./settings";
export * from "./ui";
export * from "./stores";

// Additional types for search and visualization features
export interface SearchResultItem {
  file_id: string;
  filename: string;
  score: number;
  content?: Array<{
    type: string;
    text: string;
  }>;
  attributes?: Record<string, unknown>;
}

export interface AiSearchResponse {
  response: string;
  data: SearchResultItem[];
  search_query: string;
}

export interface VectorNode {
  id: string;
  label: string;
  group?: string;
  size?: number;
  [key: string]: unknown;
}

export interface GraphLink {
  source: string | VectorNode;
  target: string | VectorNode;
  value?: number;
  [key: string]: unknown;
}

// Vector-related types
export interface ListVectorsResponse {
  data: VectorRow[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface VectorRow {
  id: string;
  filename?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface VectorMatch {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}
