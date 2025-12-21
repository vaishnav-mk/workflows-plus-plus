export interface CloudflareErrorResponse {
  success: false;
  errors?: Array<{
    code?: number;
    message?: string;
  }>;
  messages?: unknown[];
  result?: unknown;
}

export interface EffectError {
  _tag: string;
  message: string;
}

