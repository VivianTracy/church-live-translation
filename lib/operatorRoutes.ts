import { isPhoneLineId } from "@/lib/translationPhoneLine";

export const OPERATOR_LIVE_PATH = "/operator-live";
export const OPERATOR_LANGUAGES_PATH = "/operator-languages";
export const OPERATOR_CHOOSER_PATH = "/operator";
export const OPERATOR_PHONE_PATH = "/operator-phone";

/** Session expiry returns to the operator page that was open. */
export function operatorSessionReturnPath(
  pathname: string,
  search = ""
): string {
  if (pathname === OPERATOR_PHONE_PATH) {
    const line = new URLSearchParams(search).get("line");

    return isPhoneLineId(line)
      ? `${OPERATOR_PHONE_PATH}?line=${line}`
      : OPERATOR_LIVE_PATH;
  }

  if (
    pathname === OPERATOR_LIVE_PATH ||
    pathname.startsWith(`${OPERATOR_LIVE_PATH}/`) ||
    pathname === OPERATOR_LANGUAGES_PATH ||
    pathname.startsWith(`${OPERATOR_LANGUAGES_PATH}/`)
  ) {
    return pathname;
  }

  return OPERATOR_LIVE_PATH;
}

/** Sign-in may return to one phone window. Other pages stay path-only. */
export function operatorLoginNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return OPERATOR_CHOOSER_PATH;
  }

  const queryIndex = value.indexOf("?");
  const pathname = queryIndex === -1 ? value : value.slice(0, queryIndex);
  const search = queryIndex === -1 ? "" : value.slice(queryIndex);

  if (pathname === "/") {
    return OPERATOR_CHOOSER_PATH;
  }

  if (pathname === OPERATOR_PHONE_PATH) {
    return operatorSessionReturnPath(pathname, search);
  }

  return pathname;
}
