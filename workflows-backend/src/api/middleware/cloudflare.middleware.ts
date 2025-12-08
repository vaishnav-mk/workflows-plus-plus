import { Context, Next } from "hono";
import Cloudflare from "cloudflare";
import { AppContext } from "../../core/types";

export const cloudflareMiddleware = async (c: Context<AppContext>, next: Next) => {
  const credentials = c.get("credentials");

  const cloudflare = new Cloudflare({
    apiToken: credentials?.apiToken
  });

  c.set("cloudflare", cloudflare);

  await next();
};
