import {
  resolveChurchAccess,
  type ChurchAccessResult,
  type ChurchOperatorContext,
  type ChurchOperatorRecord,
} from "@/lib/churchOperator";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSignedInUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

async function getChurchMembership(
  userId: string
): Promise<ChurchOperatorRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("church_operators")
    .select("church_id, role, churches(id, name, status, slug)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ChurchOperatorRecord;
}

export async function getChurchAccessForUser(
  userId: string,
  email?: string | null
): Promise<ChurchAccessResult> {
  const membership = await getChurchMembership(userId);

  return resolveChurchAccess({
    userId,
    email,
    membership,
  });
}

export async function getChurchOperatorForUser(
  userId: string,
  email?: string | null
): Promise<ChurchOperatorContext | null> {
  const access = await getChurchAccessForUser(userId, email);

  return access.ok ? access.operator : null;
}

export async function getChurchOperatorFromRequest(): Promise<ChurchOperatorContext | null> {
  const user = await getSignedInUser();

  if (!user) {
    return null;
  }

  return getChurchOperatorForUser(user.id, user.email);
}

export async function getDecryptedChurchOpenAIApiKey(
  churchId: string
): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("church_openai_api_key", {
    p_church_id: churchId,
  });

  if (error || typeof data !== "string" || !data.trim()) {
    return null;
  }

  return data.trim();
}

export async function getChurchOpenAIKeyLastFour(
  churchId: string
): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("church_openai_key_last_four", {
    p_church_id: churchId,
  });

  if (error || typeof data !== "string" || data.length !== 4) {
    return null;
  }

  return data;
}
