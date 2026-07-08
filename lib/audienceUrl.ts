export function getTranslationListenUrl(origin?: string): string {
  const configured = process.env.NEXT_PUBLIC_AUDIENCE_URL?.replace(/\/$/, "");

  if (configured) {
    return `${configured}/listen`;
  }

  if (origin) {
    return `${origin.replace(/\/$/, "")}/listen`;
  }

  return "/listen";
}
