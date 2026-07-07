import type { SermonSession, SermonSessionRequest } from "@/types/sermonSession";

export async function loadSermonSession(): Promise<SermonSession | null> {
  const response = await fetch("/api/sermon-session");

  if (!response.ok) {
    throw new Error("Failed to load sermon session.");
  }

  return response.json();
}

export async function postSermonSession(
  request: SermonSessionRequest
): Promise<SermonSession | null> {
  const response = await fetch("/api/sermon-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Failed to update sermon session.");
  }

  return response.json();
}

export function startSermonSession() {
  return postSermonSession({ action: "start" });
}

export function pauseSermonSession() {
  return postSermonSession({ action: "pause" });
}

export function resumeSermonSession() {
  return postSermonSession({ action: "resume" });
}

export function endSermonSession() {
  return postSermonSession({ action: "end" });
}

export function appendSermonSegment(chinese: string, english: string) {
  return postSermonSession({ action: "append", chinese, english });
}
