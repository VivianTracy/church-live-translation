import {
  OPERATOR_LOGIN_COOKIE,
  evaluateOperatorLogin,
  isOperatorLoginId,
  operatorIdleDeadlineAt,
  operatorLoginCookieOptions,
  operatorLoginReasonMessage,
  type OperatorLoginReason,
  type OperatorLoginTimes,
} from "@/lib/operatorLogin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

type OperatorLoginRow = {
  login_id: string;
  logged_in_at: string;
  last_translation_at: string | null;
};

export type ActiveOperatorFailure = {
  ok: false;
  status: number;
  error: string;
  reason: OperatorLoginReason | "unauthenticated" | "error";
};

export type ActiveOperatorSuccess = {
  ok: true;
  user: User;
  login: OperatorLoginTimes;
};

export type ActiveOperatorResult = ActiveOperatorSuccess | ActiveOperatorFailure;

function asOperatorLoginTimes(row: OperatorLoginRow): OperatorLoginTimes {
  return {
    loginId: row.login_id,
    loggedInAt: row.logged_in_at,
    lastTranslationAt: row.last_translation_at,
  };
}

export async function readOperatorLoginCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(OPERATOR_LOGIN_COOKIE)?.value;
  return isOperatorLoginId(value) ? value : null;
}

export async function writeOperatorLoginCookie(loginId: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    OPERATOR_LOGIN_COOKIE,
    loginId,
    operatorLoginCookieOptions()
  );
}

export async function clearOperatorLoginCookie() {
  const cookieStore = await cookies();
  cookieStore.set(OPERATOR_LOGIN_COOKIE, "", {
    ...operatorLoginCookieOptions(),
    maxAge: 0,
  });
}

async function loadOperatorLogin(
  userId: string
): Promise<OperatorLoginTimes | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("operator_logins")
    .select("login_id, logged_in_at, last_translation_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return asOperatorLoginTimes(data as OperatorLoginRow);
}

export async function invalidateLocalOperatorSession() {
  const loginId = await readOperatorLoginCookie();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && loginId) {
    const admin = createSupabaseAdminClient();
    await admin
      .from("operator_logins")
      .delete()
      .eq("user_id", user.id)
      .eq("login_id", loginId);
  }

  await supabase.auth.signOut({ scope: "local" });
  await clearOperatorLoginCookie();
}

async function revokeOtherAuthSessions() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.signOut(
    session.access_token,
    "others"
  );

  if (error) {
    console.error("Operator single-login revoke error:", error);
  }
}

export async function claimOperatorLoginForCurrentUser(): Promise<
  ActiveOperatorResult
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      status: 401,
      reason: "unauthenticated",
      error: "Sign in required.",
    };
  }

  const loginId = crypto.randomUUID();
  const now = new Date().toISOString();
  const admin = createSupabaseAdminClient();
  const { data, error: upsertError } = await admin
    .from("operator_logins")
    .upsert({
      user_id: user.id,
      login_id: loginId,
      logged_in_at: now,
      last_translation_at: null,
      updated_at: now,
    })
    .select("login_id, logged_in_at, last_translation_at")
    .single();

  if (upsertError || !data) {
    console.error("Operator login claim error:", upsertError);
    return {
      ok: false,
      status: 500,
      reason: "error",
      error: "Could not finish church sign-in.",
    };
  }

  await revokeOtherAuthSessions();
  await writeOperatorLoginCookie(loginId);

  return {
    ok: true,
    user,
    login: asOperatorLoginTimes(data as OperatorLoginRow),
  };
}

export async function getActiveOperatorUser(): Promise<ActiveOperatorResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      status: 401,
      reason: "unauthenticated",
      error: "Sign in required.",
    };
  }

  let stored: OperatorLoginTimes | null;

  try {
    stored = await loadOperatorLogin(user.id);
  } catch (loadError) {
    console.error("Operator login lookup error:", loadError);
    return {
      ok: false,
      status: 500,
      reason: "error",
      error: "Could not confirm church sign-in.",
    };
  }

  const decision = evaluateOperatorLogin({
    cookieLoginId: await readOperatorLoginCookie(),
    stored,
  });

  if (!decision.ok) {
    await invalidateLocalOperatorSession();
    return {
      ok: false,
      status: 401,
      reason: decision.reason,
      error:
        operatorLoginReasonMessage(decision.reason) ?? "Sign in required.",
    };
  }

  if (!stored) {
    await invalidateLocalOperatorSession();
    return {
      ok: false,
      status: 401,
      reason: "replaced",
      error: operatorLoginReasonMessage("replaced") ?? "Sign in required.",
    };
  }

  return {
    ok: true,
    user,
    login: stored,
  };
}

export async function touchCurrentOperatorTranslation(): Promise<
  ActiveOperatorResult
> {
  const active = await getActiveOperatorUser();

  if (!active.ok) {
    return active;
  }

  const now = new Date().toISOString();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("operator_logins")
    .update({ last_translation_at: now })
    .eq("user_id", active.user.id)
    .eq("login_id", active.login.loginId)
    .select("login_id, logged_in_at, last_translation_at")
    .maybeSingle();

  if (error) {
    console.error("Operator translation activity error:", error);
    return {
      ok: false,
      status: 500,
      reason: "error",
      error: "Could not record translation activity.",
    };
  }

  if (!data) {
    await invalidateLocalOperatorSession();
    return {
      ok: false,
      status: 401,
      reason: "replaced",
      error: operatorLoginReasonMessage("replaced") ?? "Sign in required.",
    };
  }

  return {
    ok: true,
    user: active.user,
    login: asOperatorLoginTimes(data as OperatorLoginRow),
  };
}

export function operatorAuthErrorResponse(result: ActiveOperatorFailure) {
  return NextResponse.json(
    { error: result.error, reason: result.reason },
    { status: result.status }
  );
}

export function operatorLoginJson(login: OperatorLoginTimes) {
  return {
    idleDeadlineAt: operatorIdleDeadlineAt(login),
  };
}
