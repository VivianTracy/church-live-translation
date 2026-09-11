export function reportTranslationSessionDuration(
  sessionEventId: string,
  durationSeconds: number
): void {
  if (!sessionEventId || durationSeconds < 0) {
    return;
  }

  void fetch("/api/operator/session-duration", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionEventId,
      durationSeconds,
    }),
    keepalive: true,
  }).catch(() => {
    // Duration is best-effort. Headset translation still works.
  });
}
