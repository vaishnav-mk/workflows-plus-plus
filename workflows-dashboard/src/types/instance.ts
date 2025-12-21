export interface InstanceStep {
  name: string;
  start: string;
  end: string | null;
  success: boolean | null;
  output?: any;
  error?: {
    message?: string;
    name?: string;
  } | string;
  type?: string;
  config?: {
    retries?: {
      limit?: number;
      delay?: number;
      backoff?: string;
    };
    timeout?: string;
  };
  attempts?: Array<{
    start: string;
    end: string;
    success: boolean;
    error?: {
      message?: string;
      name?: string;
    };
  }>;
}

export interface InstanceDetail {
  trigger?: {
    source?: string;
  };
  versionId?: string;
  queued?: string;
  start?: string;
  end?: string;
  success?: boolean;
  error?: {
    message?: string;
    name?: string;
  } | string;
  status: string;
  steps?: InstanceStep[];
}

