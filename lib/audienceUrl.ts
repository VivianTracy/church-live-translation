import { getTranslationRelayOrigin } from "@/lib/translationRelayUrl";

export function getTranslationListenUrl(origin?: string): string {
  const configured = getTranslationRelayOrigin();

  if (configured) {
    return `${configured}/listen`;
  }

  if (origin) {
    return `${origin.replace(/\/$/, "")}/listen`;
  }

  return "/listen";
}
