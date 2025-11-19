export interface Version {
  id: string;
  created_on: string;
  number: number;
  compatibility_date?: string;
  main_module?: string;
  annotations?: {
    "workers/triggered_by"?: string;
    "workers/message"?: string;
    "workers/tag"?: string;
  };
  usage_model?: string;
  source?: string;
  modules?: Array<{
    name: string;
    content_type: string;
    content_base64: string;
  }>;
  bindings?: Array<{
    name: string;
    type: string;
    text?: string;
    json?: boolean;
  }>;
}

export interface VersionsV4PagePaginationArray {
  data: Version[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
