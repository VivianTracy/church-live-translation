import { parseChurchSlug } from "@/lib/churchSlug";

export type ChurchOperatorRole = "operator" | "admin";

export type ChurchOperatorContext = {
  userId: string;
  email: string | null;
  churchId: string;
  churchName: string;
  churchSlug: string;
  role: ChurchOperatorRole;
};

export type ChurchRecord = {
  id: string;
  name: string;
  slug: string;
  status?: string;
};

export type ChurchOperatorRecord = {
  church_id: string;
  role: string;
  churches: ChurchRecord | ChurchRecord[] | null;
};

export function isChurchOperatorRole(role: string): role is ChurchOperatorRole {
  return role === "operator" || role === "admin";
}

export const CHURCH_PENDING_LOGIN_MESSAGE =
  "This church is waiting for confirmation. You will get an email when you can sign in.";

export type ChurchAccessResult =
  | { ok: true; operator: ChurchOperatorContext }
  | {
      ok: false;
      reason: "pending" | "none";
      churchName?: string;
      churchSlug?: string;
    };

export function isActiveChurch(status: string | undefined): boolean {
  return status === "active" || status === undefined;
}

export function isPendingChurch(status: string | undefined): boolean {
  return status === "pending";
}

export function resolveChurchFromMembership(
  churches: ChurchOperatorRecord["churches"]
): ChurchRecord | null {
  if (!churches) {
    return null;
  }

  return Array.isArray(churches) ? churches[0] ?? null : churches;
}

export function resolveChurchAccess(input: {
  userId: string;
  email?: string | null;
  membership: ChurchOperatorRecord | null;
}): ChurchAccessResult {
  if (!input.membership || !isChurchOperatorRole(input.membership.role)) {
    return { ok: false, reason: "none" };
  }

  const church = resolveChurchFromMembership(input.membership.churches);
  const churchSlug = parseChurchSlug(church?.slug);

  if (!church || !churchSlug) {
    return { ok: false, reason: "none" };
  }

  if (isPendingChurch(church.status)) {
    return {
      ok: false,
      reason: "pending",
      churchName: church.name,
      churchSlug,
    };
  }

  if (!isActiveChurch(church.status)) {
    return { ok: false, reason: "none" };
  }

  return {
    ok: true,
    operator: {
      userId: input.userId,
      email: input.email ?? null,
      churchId: church.id,
      churchName: church.name,
      churchSlug,
      role: input.membership.role,
    },
  };
}

export function resolveChurchOperator(input: {
  userId: string;
  email?: string | null;
  membership: ChurchOperatorRecord | null;
}): ChurchOperatorContext | null {
  const access = resolveChurchAccess(input);

  return access.ok ? access.operator : null;
}
