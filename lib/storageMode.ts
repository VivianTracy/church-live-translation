export function isLocalCaptionStorage(): boolean {
  const mode = process.env.CAPTION_STORAGE?.trim().toLowerCase();

  if (mode === "local") {
    return true;
  }

  if (mode === "redis") {
    return false;
  }

  return !process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN;
}
