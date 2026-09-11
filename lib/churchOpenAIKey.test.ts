import {
  decryptOpenAIApiKey,
  encryptOpenAIApiKey,
  resolveEncryptionKeyBytes,
} from "@/lib/churchOpenAIKey";
import { describe, expect, it } from "vitest";

const SECRET = "a".repeat(64);

describe("church OpenAI key encryption", () => {
  it("reads a 32-byte hex secret", () => {
    expect(resolveEncryptionKeyBytes(SECRET)).toHaveLength(32);
  });

  it("round-trips an API key", () => {
    const encrypted = encryptOpenAIApiKey("sk-test-key", SECRET);

    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(encrypted).not.toContain("sk-test-key");
    expect(decryptOpenAIApiKey(encrypted, SECRET)).toBe("sk-test-key");
  });

  it("rejects a tampered payload", () => {
    const encrypted = encryptOpenAIApiKey("sk-test-key", SECRET);
    const tampered = `${encrypted.slice(0, -2)}aa`;

    expect(() => decryptOpenAIApiKey(tampered, SECRET)).toThrow();
  });
});
