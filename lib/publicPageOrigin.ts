import { headers } from "next/headers";
import {
  getTranslationRelayOrigin,
  isLocalDevHostname,
} from "@/lib/translationRelayUrl";

/** Origin used for church QR codes: the public audience site, or this request. */
export async function getPublicPageOrigin(): Promise<string> {
  const configured = getTranslationRelayOrigin();

  if (configured) {
    return configured;
  }

  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "127.0.0.1:3000";
  const hostname = host.split(":")[0] ?? "";
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (isLocalDevHostname(hostname) ? "http" : "https");

  return `${protocol}://${host}`;
}
