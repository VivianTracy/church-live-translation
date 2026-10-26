import { getTranslationListenPath } from "@/lib/churchSlug";
import {
  getTranslationCaptionPath,
  type CaptionTrack,
} from "@/lib/translationCaptionTrack";
import { getTranslationRelayOrigin } from "@/lib/translationRelayUrl";

function getPublicAudienceUrl(origin: string | undefined, path: string): string {
  const configured = getTranslationRelayOrigin();

  if (configured) {
    return `${configured}${path}`;
  }

  if (origin) {
    return `${origin.replace(/\/$/, "")}${path}`;
  }

  return path;
}

export function getTranslationListenUrl(
  origin: string | undefined,
  churchSlug: string
): string {
  return getPublicAudienceUrl(origin, getTranslationListenPath(churchSlug));
}

export function getTranslationCaptionUrl(
  origin: string | undefined,
  churchSlug: string,
  track: CaptionTrack
): string {
  return getPublicAudienceUrl(origin, getTranslationCaptionPath(churchSlug, track));
}
