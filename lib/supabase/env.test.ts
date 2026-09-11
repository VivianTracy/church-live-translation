import {
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
  isVercelDeployment,
} from "@/lib/supabase/env";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("supabase env", () => {
  it("is configured when the public URL and anon key are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", '"anon-key"');
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(isSupabaseConfigured()).toBe(true);
    expect(isSupabaseAdminConfigured()).toBe(false);
  });

  it("detects Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    expect(isVercelDeployment()).toBe(true);
  });
});
