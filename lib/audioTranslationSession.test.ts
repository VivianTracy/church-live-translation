import {
  canUseLocalOpenAIKey,
  requiresChurchLogin,
  resolveOutputLanguage,
} from "@/lib/audioTranslationSessionMode";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("audio translation session auth mode", () => {
  it("requires church login on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "sk-local");

    expect(requiresChurchLogin()).toBe(true);
    expect(canUseLocalOpenAIKey()).toBe(false);
  });

  it("requires church login when Supabase is configured", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("OPENAI_API_KEY", "sk-local");

    expect(requiresChurchLogin()).toBe(true);
    expect(canUseLocalOpenAIKey()).toBe(false);
  });

  it("keeps the local OpenAI key only when church login is not configured", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "sk-local");

    expect(requiresChurchLogin()).toBe(false);
    expect(canUseLocalOpenAIKey()).toBe(true);
  });

  it("defaults the output language to English", () => {
    expect(resolveOutputLanguage(undefined)).toBe("en");
    expect(resolveOutputLanguage("zh")).toBe("zh");
    expect(resolveOutputLanguage("fr")).toBe("en");
  });
});
