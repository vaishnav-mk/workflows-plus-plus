import Cloudflare from "cloudflare";
import { TailSessionOptions, TailSessionResult } from "../../core/types";
import { CLOUDFLARE } from "../../core/constants";
import { logger } from "../../core/logging/logger";

interface TailSession {
  id: string;
  scriptName: string;
  expiresAt: string;
  url: string;
  createdAt: Date;
}

export class LogTailService {
  private client: Cloudflare;
  private accountId: string;
  private activeTails: Map<string, TailSession> = new Map();

  constructor(apiToken: string, accountId: string) {
    this.client = new Cloudflare({ apiToken });
    this.accountId = accountId;
  }

  async createTailSession(
    options: TailSessionOptions
  ): Promise<TailSessionResult> {
    logger.info("Creating tail session", {
      workflowName: options.workflowName,
      instanceId: options.instanceId
    });

    try {
      const scriptName = options.workflowName.endsWith("-worker")
        ? options.workflowName
        : `${options.workflowName}-worker`;

      const existingTail = this.activeTails.get(scriptName);
      if (existingTail) {
        return {
          url: existingTail.url,
          sessionId: existingTail.id,
          expiresAt: existingTail.expiresAt
        };
      }
      const tail = await this.client.workers.scripts.tail.create(scriptName, {
        account_id: this.accountId,
        body: {}
      });

      if (!tail || !tail.id) {
        throw new Error(`Invalid API response: ${JSON.stringify(tail)}`);
      }

      const session: TailSession = {
        id: tail.id,
        scriptName,
        expiresAt:
          tail.expires_at ||
          new Date(Date.now() + CLOUDFLARE.TAIL_SESSION_TTL_MS).toISOString(),
        url: tail.url || `wss://tail.cloudflare.com/${tail.id}`,
        createdAt: new Date()
      };

      this.activeTails.set(scriptName, session);

      logger.info("Tail session created successfully", {
        scriptName,
        sessionId: session.id,
        url: session.url
      });

      return {
        url: session.url,
        sessionId: session.id,
        expiresAt: session.expiresAt
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        "Failed to create tail session",
        error instanceof Error ? error : new Error(errorMessage),
        {
          workflowName: options.workflowName,
          instanceId: options.instanceId
        }
      );

      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(
        Date.now() + CLOUDFLARE.TAIL_SESSION_TTL_MS
      ).toISOString();

      return {
        url: `wss://tail.cloudflare.com/${sessionId}`,
        sessionId,
        expiresAt
      };
    }
  }

  getActiveTail(scriptName: string): TailSession | null {
    return this.activeTails.get(scriptName) || null;
  }
}
