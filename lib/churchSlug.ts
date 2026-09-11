export const LOCAL_LISTEN_CHURCH_SLUG = "local";

const CHURCH_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_CHURCH_SLUG_LENGTH = 64;

export function parseChurchSlug(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const slug = value.trim().toLowerCase();

  if (
    slug.length === 0 ||
    slug.length > MAX_CHURCH_SLUG_LENGTH ||
    !CHURCH_SLUG_PATTERN.test(slug)
  ) {
    return null;
  }

  return slug;
}

export function isChurchSlug(value: unknown): value is string {
  return parseChurchSlug(value) !== null;
}

export function getTranslationListenPath(churchSlug: string): string {
  return `/listen/${churchSlug}`;
}

export function withChurchSearchParam(path: string, churchSlug: string): string {
  const url = new URL(path, "http://listen.local");
  url.searchParams.set("church", churchSlug);
  return `${url.pathname}${url.search}`;
}
