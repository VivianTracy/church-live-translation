function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

export function getListenRedisUrl(): string | undefined {
  return firstEnv("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL");
}

export function getListenRedisToken(): string | undefined {
  return firstEnv("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN");
}

export function hasListenRedisEnv(): boolean {
  return Boolean(getListenRedisUrl() && getListenRedisToken());
}
