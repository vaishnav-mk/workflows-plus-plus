import { logger } from "../logging/logger";
import { CloudflareCredentials } from "../types";

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

async function deriveKey(
  salt: Uint8Array,
  masterKey: string
): Promise<CryptoKey> {
  if (!masterKey) {
    throw new Error("credentials_master_key required");
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterKey),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const saltBuffer = new ArrayBuffer(salt.length);
  const saltView = new Uint8Array(saltBuffer);
  saltView.set(salt);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptCredentials(
  credentials: CloudflareCredentials,
  masterKey: string
): Promise<string> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const key = await deriveKey(salt, masterKey);

    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(credentials));

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      plaintext
    );

    const combined = new Uint8Array(
      SALT_LENGTH + IV_LENGTH + ciphertext.byteLength
    );
    combined.set(salt, 0);
    combined.set(iv, SALT_LENGTH);
    combined.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      "failed to encrypt credentials",
      error instanceof Error ? error : new Error(errorMessage)
    );
    throw new Error("failed to encrypt credentials");
  }
}

export async function decryptCredentials(
  encrypted: string,
  masterKey: string
): Promise<CloudflareCredentials> {
  try {
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

    const key = await deriveKey(salt, masterKey);

    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const credentials = JSON.parse(
      decoder.decode(plaintext)
    ) as CloudflareCredentials;

    if (!credentials.apiToken || !credentials.accountId) {
      throw new Error("invalid credentials format");
    }

    return credentials;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      "failed to decrypt credentials",
      error instanceof Error ? error : new Error(errorMessage)
    );
    throw new Error("failed to decrypt credentials");
  }
}
