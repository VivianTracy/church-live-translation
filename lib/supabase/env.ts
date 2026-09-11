function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/^['"]|['"]$/g, "");
  return trimmed || undefined;
}

export function getSupabaseUrl(): string | undefined {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string | undefined {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(isSupabaseConfigured() && getSupabaseServiceRoleKey());
}

export function requireSupabaseUrl(): string {
  const url = getSupabaseUrl();

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }

  return url;
}

export function requireSupabaseAnonKey(): string {
  const key = getSupabaseAnonKey();

  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");
  }

  return key;
}

export function requireSupabaseServiceRoleKey(): string {
  const key = getSupabaseServiceRoleKey();

  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return key;
}

export function isVercelDeployment(): boolean {
  return process.env.VERCEL === "1";
}
