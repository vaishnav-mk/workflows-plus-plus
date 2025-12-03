/**
 * Credentials Encryption/Decryption Utility
 * Uses AES-GCM-256 with PBKDF2 key derivation
 */

import { logger } from "../logging/logger";

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

export interface CloudflareCredentials {
  apiToken: string;
  accountId: string;
}

/**
 * Derives encryption key from master password using PBKDF2
 * In production, this should use a secure master key from environment
 */
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  // Use a master key from environment or generate a default
  // In production, this should be a strong secret stored securely
  const masterKey = typeof process !== "undefined" && process.env?.CREDENTIALS_MASTER_KEY
    ? process.env.CREDENTIALS_MASTER_KEY
    : "default-master-key-change-in-production"; // Fallback for development

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterKey),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Convert Uint8Array to ArrayBuffer for salt
  // Create a new ArrayBuffer and copy the salt data
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

/**
 * Encrypts credentials using AES-GCM-256
 * Format: Base64-encoded [salt (16 bytes)][iv (12 bytes)][ciphertext]
 */
export async function encryptCredentials(
  credentials: CloudflareCredentials
): Promise<string> {
  try {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive encryption key
    const key = await deriveKey(salt);

    // Encrypt credentials
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

    // Combine salt + iv + ciphertext
    const combined = new Uint8Array(
      SALT_LENGTH + IV_LENGTH + ciphertext.byteLength
    );
    combined.set(salt, 0);
    combined.set(iv, SALT_LENGTH);
    combined.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

    // Return base64-encoded string
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to encrypt credentials", error instanceof Error ? error : new Error(errorMessage));
    throw new Error("Failed to encrypt credentials");
  }
}

/**
 * Decrypts credentials from encrypted string
 * Format: Base64-encoded [salt (16 bytes)][iv (12 bytes)][ciphertext]
 */
export async function decryptCredentials(
  encrypted: string
): Promise<CloudflareCredentials> {
  try {
    // Decode base64
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

    // Extract salt, IV, and ciphertext
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

    // Derive decryption key
    const key = await deriveKey(salt);

    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      ciphertext
    );

    // Parse JSON
    const decoder = new TextDecoder();
    const credentials = JSON.parse(decoder.decode(plaintext)) as CloudflareCredentials;

    if (!credentials.apiToken || !credentials.accountId) {
      throw new Error("Invalid credentials format");
    }

    return credentials;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to decrypt credentials", error instanceof Error ? error : new Error(errorMessage));
    throw new Error("Failed to decrypt credentials");
  }
}

