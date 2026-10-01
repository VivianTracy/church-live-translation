import { getTranslationRelayOrigin } from "@/lib/translationRelayUrl";
import { getTranslationListenPath } from "@/lib/churchSlug";

export function getTranslationListenUrl(
  origin: string | undefined,
  churchSlug: string
): string {
  const configured = getTranslationRelayOrigin();
  const path = getTranslationListenPath(churchSlug);

  if (configured) {
    return `${configured}${path}`;
  }

  if (origin) {
    return `${origin.replace(/\/$/, "")}${path}`;
  }

  return path;
}
