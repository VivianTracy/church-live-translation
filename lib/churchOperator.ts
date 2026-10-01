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

export function isActiveChurch(status: string | undefined): boolean {
  return status === "active" || status === "pending" || status === undefined;
}

export function resolveChurchFromMembership(
  churches: ChurchOperatorRecord["churches"]
): ChurchRecord | null {
  if (!churches) {
    return null;
  }

  return Array.isArray(churches) ? churches[0] ?? null : churches;
}

export function resolveChurchOperator(input: {
  userId: string;
  email?: string | null;
  membership: ChurchOperatorRecord | null;
}): ChurchOperatorContext | null {
  if (!input.membership || !isChurchOperatorRole(input.membership.role)) {
    return null;
  }

  const church = resolveChurchFromMembership(input.membership.churches);
  const churchSlug = parseChurchSlug(church?.slug);

  if (!church || !isActiveChurch(church.status) || !churchSlug) {
    return null;
  }

  return {
    userId: input.userId,
    email: input.email ?? null,
    churchId: church.id,
    churchName: church.name,
    churchSlug,
    role: input.membership.role,
  };
}
