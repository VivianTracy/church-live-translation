import { redis } from "@/lib/redis";

export const SESSION_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
export const SESSION_RATE_LIMIT_MAX_PER_CHURCH = 8;
export const SESSION_RATE_LIMIT_MAX_PER_USER = 8;

export type SessionRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

const memoryCounts = new Map<string, { count: number; resetAt: number }>();

export function isSessionCreateAllowed(count: number, limit: number): boolean {
  return count <= limit;
}

export function sessionRateLimitKey(
  scope: "church" | "user",
  id: string
): string {
  return `translation-session:${scope}:${id}`;
}

function memoryIncrement(
  key: string,
  windowSeconds: number
): { count: number; resetAt: number } {
  const now = Date.now();
  const current = memoryCounts.get(key);

  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowSeconds * 1000 };
    memoryCounts.set(key, next);
    return next;
  }

  const next = { count: current.count + 1, resetAt: current.resetAt };
  memoryCounts.set(key, next);
  return next;
}

async function incrementWindow(
  key: string,
  windowSeconds: number
): Promise<{ count: number; ttlSeconds: number }> {
  if (redis) {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSeconds);
      return { count, ttlSeconds: windowSeconds };
    }

    const ttl = await redis.ttl(key);
    return {
      count,
      ttlSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  }

  const local = memoryIncrement(key, windowSeconds);
  return {
    count: local.count,
    ttlSeconds: Math.max(1, Math.ceil((local.resetAt - Date.now()) / 1000)),
  };
}

export async function consumeTranslationSessionRateLimit(input: {
  churchId: string;
  userId: string;
}): Promise<SessionRateLimitResult> {
  const church = await incrementWindow(
    sessionRateLimitKey("church", input.churchId),
    SESSION_RATE_LIMIT_WINDOW_SECONDS
  );
  const user = await incrementWindow(
    sessionRateLimitKey("user", input.userId),
    SESSION_RATE_LIMIT_WINDOW_SECONDS
  );

  if (
    isSessionCreateAllowed(church.count, SESSION_RATE_LIMIT_MAX_PER_CHURCH) &&
    isSessionCreateAllowed(user.count, SESSION_RATE_LIMIT_MAX_PER_USER)
  ) {
    return { allowed: true };
  }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(church.ttlSeconds, user.ttlSeconds),
  };
}

export function resetTranslationSessionRateLimitMemory() {
  memoryCounts.clear();
}
