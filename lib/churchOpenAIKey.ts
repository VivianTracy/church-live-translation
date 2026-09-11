import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION_PREFIX = "v1:";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function cleanSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/^['"]|['"]$/g, "");
  return trimmed || undefined;
}

export function getChurchSecretEncryptionKey(): string | undefined {
  return cleanSecret(process.env.CHURCH_SECRET_ENCRYPTION_KEY);
}

export function resolveEncryptionKeyBytes(secret: string): Buffer {
  const trimmed = secret.trim();

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const fromBase64 = Buffer.from(trimmed, "base64");

  if (fromBase64.length === KEY_LENGTH) {
    return fromBase64;
  }

  return createHash("sha256").update(trimmed).digest();
}

export function encryptOpenAIApiKey(
  apiKey: string,
  secret = getChurchSecretEncryptionKey()
): string {
  if (!secret) {
    throw new Error("CHURCH_SECRET_ENCRYPTION_KEY is not configured");
  }

  const keyBytes = resolveEncryptionKeyBytes(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", keyBytes, iv);
  const ciphertext = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${VERSION_PREFIX}${Buffer.concat([iv, ciphertext, tag]).toString("base64")}`;
}

export function decryptOpenAIApiKey(
  encrypted: string,
  secret = getChurchSecretEncryptionKey()
): string {
  if (!secret) {
    throw new Error("CHURCH_SECRET_ENCRYPTION_KEY is not configured");
  }

  if (!encrypted.startsWith(VERSION_PREFIX)) {
    throw new Error("Unsupported church OpenAI key encoding");
  }

  const payload = Buffer.from(encrypted.slice(VERSION_PREFIX.length), "base64");

  if (payload.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Church OpenAI key payload is invalid");
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(payload.length - AUTH_TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH, payload.length - AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    resolveEncryptionKeyBytes(secret),
    iv
  );
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8"
  );
}
