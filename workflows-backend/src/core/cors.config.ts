export const corsConfig = {
  origin: (origin: string | undefined) => {
    if (origin) {
      return origin;
    }
    return "*";
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  exposeHeaders: ["Content-Length", "Content-Type"]
};

export function getCorsHeaders(origin: string | null | undefined): HeadersInit {
  const headers: HeadersInit = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With"
  };

  if (origin) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function getSSECorsHeaders(
  origin: string | null | undefined,
  methods: string = "GET, POST",
  additionalHeaders: string[] = []
): HeadersInit {
  const headers: HeadersInit = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": ["Content-Type", ...additionalHeaders].join(
      ", "
    )
  };

  if (origin) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}
