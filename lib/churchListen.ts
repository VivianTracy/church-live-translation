import { parseChurchSlug } from "@/lib/churchSlug";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

const LISTEN_CHURCH_CACHE_MS = 5 * 60 * 1000;

export type ListenChurch = {
  id: string;
  slug: string;
  name: string;
};

type CachedListenChurch = {
  church: ListenChurch | null;
  expiresAt: number;
};

const listenChurchCache = new Map<string, CachedListenChurch>();

export class InvalidListenChurchError extends Error {
  constructor() {
    super("A church is required for the phone listener.");
  }
}

export class UnknownListenChurchError extends Error {
  constructor() {
    super("This listener link is not for a known church.");
  }
}

export function readListenChurchSlug(raw: string | null): string {
  const slug = parseChurchSlug(raw);

  if (!slug) {
    throw new InvalidListenChurchError();
  }

  return slug;
}

export async function getActiveChurchBySlug(
  slug: string
): Promise<ListenChurch | null> {
  const parsed = parseChurchSlug(slug);

  if (!parsed || !isSupabaseAdminConfigured()) {
    return null;
  }

  const cached = listenChurchCache.get(parsed);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.church;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("churches")
    .select("id, slug, name, status")
    .eq("slug", parsed)
    .maybeSingle();

  const church =
    error || !data || (data.status !== "active" && data.status !== "pending")
      ? null
      : {
          id: data.id,
          slug: data.slug,
          name: data.name,
        };

  listenChurchCache.set(parsed, {
    church,
    expiresAt: Date.now() + LISTEN_CHURCH_CACHE_MS,
  });

  return church;
}

export async function requireListenChurchSlug(
  raw: string | null
): Promise<{ slug: string; church: ListenChurch | null }> {
  const slug = readListenChurchSlug(raw);

  if (!isSupabaseAdminConfigured()) {
    return { slug, church: null };
  }

  const church = await getActiveChurchBySlug(slug);

  if (!church) {
    throw new UnknownListenChurchError();
  }

  return { slug: church.slug, church };
}
