export class RateLimitDurableObject {
  private state: DurableObjectState;
  private env: { [key: string]: unknown };
  private counters: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(state: DurableObjectState, env: { [key: string]: unknown }) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/check" && request.method === "POST") {
      return this.handleCheck(request);
    }

    if (pathname === "/reset" && request.method === "POST") {
      return this.handleReset(request);
    }

    return new Response("Not Found", { status: 404 });
  }

  private async handleCheck(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        accountId: string;
        callType: string;
        limit: number;
        windowMs: number;
      };

      const { accountId, callType, limit, windowMs } = body;
      const key = `${accountId}:${callType}`;
      const now = Date.now();

      const stored = await this.state.storage.get<{ count: number; resetAt: number }>(key);
      let counter = stored || { count: 0, resetAt: now + windowMs };

      if (now >= counter.resetAt) {
        counter = { count: 0, resetAt: now + windowMs };
      }

      counter.count += 1;

      if (counter.count > limit) {
        await this.state.storage.put(key, counter);
        return new Response(
          JSON.stringify({
            allowed: false,
            remaining: 0,
            resetAt: counter.resetAt,
            limit
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      await this.state.storage.put(key, counter);

      return new Response(
        JSON.stringify({
          allowed: true,
          remaining: Math.max(0, limit - counter.count),
          resetAt: counter.resetAt,
          limit
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Rate limit check failed",
          message: error instanceof Error ? error.message : String(error)
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }

  private async handleReset(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        accountId: string;
        callType: string;
      };

      const { accountId, callType } = body;
      const key = `${accountId}:${callType}`;

      await this.state.storage.delete(key);

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Rate limit reset failed",
          message: error instanceof Error ? error.message : String(error)
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
}

