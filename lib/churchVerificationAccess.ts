import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  hashChurchVerificationToken,
  parseChurchVerificationToken,
  type ChurchVerificationDetails,
} from "@/lib/churchVerification";

export type ChurchVerificationRecord = ChurchVerificationDetails & {
  churchId: string;
  status: string;
  confirmedAt: string | null;
};

export type ConfirmChurchVerificationResult =
  | { ok: true; alreadyConfirmed: boolean; record: ChurchVerificationRecord }
  | { ok: false; error: "not_found" | "not_pending" };

type VerificationRow = {
  church_id: string;
  operator_email: string;
  confirmed_at: string | null;
  churches:
    | {
        id: string;
        name: string;
        slug: string;
        status: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
        status: string;
      }[]
    | null;
};

function asChurch(
  churches: VerificationRow["churches"]
): {
  id: string;
  name: string;
  slug: string;
  status: string;
} | null {
  if (!churches) {
    return null;
  }

  return Array.isArray(churches) ? churches[0] ?? null : churches;
}

function toRecord(
  row: VerificationRow,
  keyLastFour: string | null
): ChurchVerificationRecord | null {
  const church = asChurch(row.churches);

  if (!church) {
    return null;
  }

  return {
    churchId: church.id,
    churchName: church.name,
    churchSlug: church.slug,
    status: church.status,
    operatorEmail: row.operator_email,
    keyLastFour,
    confirmedAt: row.confirmed_at,
  };
}

async function getKeyLastFour(churchId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("church_openai_key_last_four", {
    p_church_id: churchId,
  });

  if (error || typeof data !== "string" || data.length !== 4) {
    return null;
  }

  return data;
}

export async function getChurchVerificationByToken(
  rawToken: string
): Promise<ChurchVerificationRecord | null> {
  const token = parseChurchVerificationToken(rawToken);

  if (!token) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("church_verifications")
    .select(
      "church_id, operator_email, confirmed_at, churches(id, name, slug, status)"
    )
    .eq("token_hash", hashChurchVerificationToken(token))
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as VerificationRow;
  const church = asChurch(row.churches);

  if (!church) {
    return null;
  }

  return toRecord(row, await getKeyLastFour(church.id));
}

export async function confirmChurchVerification(
  rawToken: string
): Promise<ConfirmChurchVerificationResult> {
  const record = await getChurchVerificationByToken(rawToken);

  if (!record) {
    return { ok: false, error: "not_found" };
  }

  if (record.status === "active" && record.confirmedAt) {
    return { ok: true, alreadyConfirmed: true, record };
  }

  if (record.status !== "pending") {
    return { ok: false, error: "not_pending" };
  }

  const admin = createSupabaseAdminClient();
  const { data: updated, error: updateError } = await admin
    .from("churches")
    .update({ status: "active" })
    .eq("id", record.churchId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Church verification update error:", updateError);
    return { ok: false, error: "not_pending" };
  }

  if (!updated) {
    const latest = await getChurchVerificationByToken(rawToken);

    if (latest?.status === "active") {
      return { ok: true, alreadyConfirmed: true, record: latest };
    }

    return { ok: false, error: "not_pending" };
  }

  const confirmedAt = new Date().toISOString();
  const { error: confirmError } = await admin
    .from("church_verifications")
    .update({ confirmed_at: confirmedAt })
    .eq("church_id", record.churchId);

  if (confirmError) {
    console.error("Church verification confirm stamp error:", confirmError);
  }

  return {
    ok: true,
    alreadyConfirmed: false,
    record: {
      ...record,
      status: "active",
      confirmedAt,
    },
  };
}
