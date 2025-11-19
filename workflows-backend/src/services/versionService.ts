import Cloudflare from 'cloudflare';
import { Env } from "../types/env";
import {
  Version,
  VersionsV4PagePaginationArray
} from "../types/version";

export class VersionService {
  private client: Cloudflare;

  constructor(private env: Env) {
    this.client = new Cloudflare({ apiToken: this.env.CF_API_TOKEN });
  }

  async listVersions(
    workerId: string,
    params: { page: number; per_page: number }
  ): Promise<VersionsV4PagePaginationArray> {
    const result = await this.client.workers.beta.workers.versions.list(workerId, {
      account_id: this.env.CF_ACCOUNT_ID,
      page: params.page,
      per_page: params.per_page
    });

    const rawData = (result as any).data || (result as any).result || result;

    const versions = Array.isArray(rawData) 
      ? rawData.map((version: any) => ({
          id: version.id,
          created_on: version.created_on,
          number: version.number,
          compatibility_date: version.compatibility_date,
          main_module: version.main_module,
          annotations: version.annotations,
          usage_model: version.usage_model,
          source: version.source
        }))
      : [];

    return {
      data: versions,
      pagination: {
        page: params.page,
        per_page: params.per_page,
        total: (result as any).result_info?.total_count || 0,
        total_pages: Math.ceil(((result as any).result_info?.total_count || 0) / params.per_page)
      }
    };
  }

  async getVersion(
    workerId: string,
    versionId: string,
    options?: { include?: string }
  ): Promise<Version> {
    const result = await this.client.workers.beta.workers.versions.get(workerId, versionId, {
      account_id: this.env.CF_ACCOUNT_ID,
      include: ['modules']
    });

    return {
      id: (result as any).id,
      created_on: (result as any).created_on,
      number: (result as any).number,
      compatibility_date: (result as any).compatibility_date,
      main_module: (result as any).main_module,
      annotations: (result as any).annotations,
      usage_model: (result as any).usage_model,
      source: (result as any).source,
      modules: (result as any).modules,
      bindings: (result as any).bindings
    };
  }
}
