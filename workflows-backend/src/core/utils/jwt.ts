import { CloudflareCredentials } from "../types";

const JWT_ALGORITHM = "HS256";
const JWT_TTL = 30 * 24 * 60 * 60;

interface JWTPayload {
  credentials: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(data);
  const base64 = btoa(String.fromCharCode(...uint8Array));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) {
    str += "=";
  }
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

async function importKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJWT(
  encryptedCredentials: string,
  secret: string,
  ttl: number = JWT_TTL
): Promise<string> {
  const header = {
    alg: JWT_ALGORITHM,
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    credentials: encryptedCredentials,
    iat: now,
    exp: now + ttl
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  
  const data = `${headerB64}.${payloadB64}`;
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );
  
  const signatureB64 = base64UrlEncode(signature);
  return `${data}.${signatureB64}`;
}

export async function verifyJWT(
  token: string,
  secret: string
): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "invalid token format" };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    
    const key = await importKey(secret);
    const encoder = new TextEncoder();
    const signature = base64UrlDecode(signatureB64);
    
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature as BufferSource,
      encoder.encode(data)
    );

    if (!valid) {
      return { valid: false, error: "invalid signature" };
    }

    const payloadData = base64UrlDecode(payloadB64);
    const payload = JSON.parse(new TextDecoder().decode(payloadData)) as JWTPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: "token expired" };
    }

    return { valid: true, payload };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : "verification failed" 
    };
  }
}

export async function createAuthToken(
  credentials: CloudflareCredentials,
  masterKey: string
): Promise<string> {
  const { encryptCredentials } = await import("./credentials");
  const encrypted = await encryptCredentials(credentials, masterKey);
  return signJWT(encrypted, masterKey);
}

export async function extractCredentialsFromToken(
  token: string,
  masterKey: string
): Promise<CloudflareCredentials | null> {
  const result = await verifyJWT(token, masterKey);
  if (!result.valid || !result.payload) {
    return null;
  }

  const { decryptCredentials } = await import("./credentials");
  try {
    return await decryptCredentials(result.payload.credentials, masterKey);
  } catch {
    return null;
  }
}
