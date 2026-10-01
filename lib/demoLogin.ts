import { getClientIp } from "@/lib/churchRegisterRateLimit";
import { redis } from "@/lib/redis";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEMO_OPERATOR_EMAIL = "vivian.zke@gmail.com";

const DEMO_LOGIN_WINDOW_SECONDS = 15 * 60;
const DEMO_LOGIN_MAX_PER_IP = 10;
const memoryCounts = new Map<string, { count: number; resetAt: number }>();

export type DemoLoginRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

function memoryIncrement(key: string, windowSeconds: number) {
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

export async function consumeDemoLoginRateLimit(
  request: Request
): Promise<DemoLoginRateLimitResult> {
  const ip = getClientIp(request) || "unknown";
  const key = `demo-login:ip:${ip}`;
  let count = 1;
  let ttlSeconds = DEMO_LOGIN_WINDOW_SECONDS;

  if (redis) {
    count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, DEMO_LOGIN_WINDOW_SECONDS);
    } else {
      const ttl = await redis.ttl(key);
      ttlSeconds = ttl > 0 ? ttl : DEMO_LOGIN_WINDOW_SECONDS;
    }
  } else {
    const local = memoryIncrement(key, DEMO_LOGIN_WINDOW_SECONDS);
    count = local.count;
    ttlSeconds = Math.max(1, Math.ceil((local.resetAt - Date.now()) / 1000));
  }

  if (count <= DEMO_LOGIN_MAX_PER_IP) {
    return { allowed: true };
  }

  return { allowed: false, retryAfterSeconds: ttlSeconds };
}

async function findDemoAuthUser() {
  const admin = createSupabaseAdminClient();
  const target = DEMO_OPERATOR_EMAIL.toLowerCase();

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === target
    );

    if (match) {
      return match;
    }

    if (data.users.length < 200) {
      return null;
    }
  }

  return null;
}

export async function signInDemoOperator(): Promise<
  { ok: true } | { ok: false }
> {
  const supabase = await createSupabaseServerClient();
  const password = process.env.DEMO_OPERATOR_PASSWORD?.trim();

  if (password) {
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_OPERATOR_EMAIL,
      password,
    });

    if (error) {
      console.error("Demo password sign-in error:", error.message);
      return { ok: false };
    }

    return { ok: true };
  }

  const existing = await findDemoAuthUser();

  if (!existing) {
    console.error("Demo account is not registered.");
    return { ok: false };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: DEMO_OPERATOR_EMAIL,
  });
  const tokenHash = data?.properties?.hashed_token;

  if (error || !tokenHash) {
    console.error("Demo sign-in link error:", error?.message);
    return { ok: false };
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });

  if (verifyError) {
    console.error("Demo sign-in verify error:", verifyError.message);
    return { ok: false };
  }

  return { ok: true };
}
