import {
  resolveChurchOperator,
  type ChurchOperatorContext,
  type ChurchOperatorRecord,
} from "@/lib/churchOperator";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptOpenAIApiKey } from "@/lib/churchOpenAIKey";

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
    .select("church_id, role, churches(id, name)")
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
  const { data, error } = await admin
    .from("church_secrets")
    .select("encrypted_openai_api_key")
    .eq("church_id", churchId)
    .maybeSingle();

  if (error || !data?.encrypted_openai_api_key) {
    return null;
  }

  return decryptOpenAIApiKey(data.encrypted_openai_api_key);
}
