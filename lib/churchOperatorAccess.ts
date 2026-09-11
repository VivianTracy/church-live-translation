import {
  resolveChurchOperator,
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

export async function getChurchOperatorForUser(
  userId: string,
  email?: string | null
): Promise<ChurchOperatorContext | null> {
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

  return resolveChurchOperator({
    userId,
    email,
    membership: data as ChurchOperatorRecord,
  });
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
