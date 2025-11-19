import Cloudflare from 'cloudflare';
import { Env } from "../types/env";
import {
  Worker,
  WorkersV4PagePaginationArray
} from "../types/worker";

export class WorkerService {
  private client: Cloudflare;

  constructor(private env: Env) {
    this.client = new Cloudflare({ apiToken: this.env.CF_API_TOKEN });
  }

  async listWorkers(params: {
    page: number;
    per_page: number;
  }): Promise<WorkersV4PagePaginationArray> {
    const result = await this.client.workers.beta.workers.list({
      account_id: this.env.CF_ACCOUNT_ID,
      page: params.page,
      per_page: params.per_page
    });

    const workers = (result as any).data?.map((worker: any) => ({
      id: worker.id,
      name: worker.name,
      created_on: worker.created_on,
      modified_on: worker.updated_on || worker.created_on
    })) || [];

    return {
      data: result.result,
      pagination: {
        page: params.page,
        per_page: params.per_page,
        total: (result as any).result_info?.total_count || 0,
        total_pages: Math.ceil(((result as any).result_info?.total_count || 0) / params.per_page)
      }
    };
  }

  async getWorker(workerId: string): Promise<Worker> {
    const result = await this.client.workers.beta.workers.get(workerId, {
      account_id: this.env.CF_ACCOUNT_ID
    });

    return {
      id: (result as any).id,
      name: (result as any).name,
      created_on: (result as any).created_on,
      modified_on: (result as any).updated_on || (result as any).created_on
    };
  }
}
