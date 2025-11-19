import Cloudflare from "cloudflare";

interface TailSession {
  id: string;
  scriptName: string;
  expiresAt: string;
  url: string;
  createdAt: Date;
}

export class TailService {
  private client: Cloudflare;
  private activeTails: Map<string, TailSession> = new Map();

  constructor(private env: any) {
    this.client = new Cloudflare({
      apiToken: env.CF_API_TOKEN
    });
  }

  async startTail(scriptName: string): Promise<TailSession> {
    try {
      const tail = await this.client.workers.scripts.tail.create(scriptName, {
        account_id: this.env.CF_ACCOUNT_ID,
        body: {}
      });

      if (!tail || !tail.id) {
        throw new Error(`Invalid API response: ${JSON.stringify(tail)}`);
      }

      const session: TailSession = {
        id: tail.id,
        scriptName,
        expiresAt: tail.expires_at,
        url: tail.url,
        createdAt: new Date()
      };

      this.activeTails.set(scriptName, session);

      return session;
    } catch (error) {
      throw error;
    }
  }

  getActiveTail(scriptName: string): TailSession | null {
    return this.activeTails.get(scriptName) || null;
  }

  async startTailForWorkflow(
    workflowName: string,
    instanceId: string
  ): Promise<TailSession | null> {
    const scriptName = workflowName.endsWith("-worker")
      ? workflowName
      : `${workflowName}-worker`;

    try {
      const existingTail = this.getActiveTail(scriptName);
      if (existingTail) {
        return existingTail;
      }

      const session = await this.startTail(scriptName);
      return session;
    } catch (error) {
      return null;
    }
  }
}
