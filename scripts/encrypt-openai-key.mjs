import { createCipheriv, createHash, randomBytes } from "node:crypto";

const secret = process.env.CHURCH_SECRET_ENCRYPTION_KEY?.trim();
const apiKey = process.argv[2] || process.env.OPENAI_API_KEY?.trim();

if (!secret) {
  console.error("Set CHURCH_SECRET_ENCRYPTION_KEY before encrypting a church key.");
  process.exit(1);
}

if (!apiKey) {
  console.error("Pass the OpenAI key: node scripts/encrypt-openai-key.mjs sk-...");
  process.exit(1);
}

const keyBytes = /^[0-9a-fA-F]{64}$/.test(secret)
  ? Buffer.from(secret, "hex")
  : Buffer.from(secret, "base64").length === 32
    ? Buffer.from(secret, "base64")
    : createHash("sha256").update(secret).digest();

const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", keyBytes, iv);
const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
const payload = Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString(
  "base64"
);

console.log(`v1:${payload}`);
