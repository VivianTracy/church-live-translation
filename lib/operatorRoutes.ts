export const OPERATOR_LIVE_PATH = "/operator-live";
export const OPERATOR_LANGUAGES_PATH = "/operator-languages";
export const OPERATOR_CHOOSER_PATH = "/operator";

/** Session expiry returns to the operator page that was open. */
export function operatorSessionReturnPath(pathname: string): string {
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
