export function getAudienceLiveUrl(origin?: string): string {
  const configured = process.env.NEXT_PUBLIC_AUDIENCE_URL?.replace(/\/$/, "");

  if (configured) {
    return `${configured}/live`;
  }

  if (origin) {
    return `${origin.replace(/\/$/, "")}/live`;
  }

  return "/live";
}
