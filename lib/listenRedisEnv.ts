function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/^['"]|['"]$/g, "");

  return trimmed || undefined;
}

function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = cleanEnv(process.env[key]);

    if (value) {
      return value;
    }
  }

  return undefined;
}

export function getListenRedisUrl(): string | undefined {
  return firstEnv("UPSTASH_REDIS_REST_URL", "KV_REST_API_URL");
}

export function getListenRedisToken(): string | undefined {
  return firstEnv("UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN");
}

export function hasListenRedisEnv(): boolean {
  return Boolean(getListenRedisUrl() && getListenRedisToken());
}
