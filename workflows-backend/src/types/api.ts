export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
}

export interface HealthCheckResponse {
  status: "ok" | "error";
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
}
