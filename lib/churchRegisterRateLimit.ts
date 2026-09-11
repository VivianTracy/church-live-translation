import { redis } from "@/lib/redis";

export const CHURCH_REGISTER_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
export const CHURCH_REGISTER_RATE_LIMIT_MAX_PER_IP = 5;

export type ChurchRegisterRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

const memoryCounts = new Map<string, { count: number; resetAt: number }>();

function churchRegisterRateLimitKey(ip: string): string {
  return `church-register:ip:${ip}`;
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

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function consumeChurchRegisterRateLimit(
  ip: string
): Promise<ChurchRegisterRateLimitResult> {
  const result = await incrementWindow(
    churchRegisterRateLimitKey(ip || "unknown"),
    CHURCH_REGISTER_RATE_LIMIT_WINDOW_SECONDS
  );

  if (result.count <= CHURCH_REGISTER_RATE_LIMIT_MAX_PER_IP) {
    return { allowed: true };
  }

  return {
    allowed: false,
    retryAfterSeconds: result.ttlSeconds,
  };
}

export function resetChurchRegisterRateLimitMemory() {
  memoryCounts.clear();
}
