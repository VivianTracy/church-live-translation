import { hasListenRedisEnv } from "@/lib/listenRedisEnv";

export function isLocalListenStorage(): boolean {
  const mode = process.env.LISTEN_STORAGE?.trim().toLowerCase();

  if (mode === "local") {
    return true;
  }

  if (mode === "redis") {
    return false;
  }

  return !hasListenRedisEnv();
}
