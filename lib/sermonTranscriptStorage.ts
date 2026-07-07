import type { SermonSession, SermonSessionStatus } from "@/types/sermonSession";
import fs from "fs/promises";
import path from "path";

const DEFAULT_TRANSCRIPT_DIR = path.join(process.cwd(), "transcripts");

function getTranscriptRoot(): string {
  return process.env.TRANSCRIPT_DIR || DEFAULT_TRANSCRIPT_DIR;
}

function activeSessionPath(): string {
  return path.join(getTranscriptRoot(), "active-session.json");
}

function formatSessionId(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}-${hours}${minutes}`;
}

async function writeActiveSession(session: SermonSession): Promise<void> {
  const root = getTranscriptRoot();
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(activeSessionPath(), JSON.stringify(session, null, 2), "utf8");
}

export async function getActiveSermonSession(): Promise<SermonSession | null> {
  try {
    const raw = await fs.readFile(activeSessionPath(), "utf8");
    const session = JSON.parse(raw) as SermonSession;

    if (session.status === "ended") {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function startSermonSession(): Promise<SermonSession> {
  const existing = await getActiveSermonSession();

  if (existing?.status === "recording") {
    return existing;
  }

  if (existing?.status === "paused") {
    return resumeSermonSession(existing);
  }

  const id = formatSessionId(new Date());
  const sessionDir = path.join(getTranscriptRoot(), id);
  await fs.mkdir(sessionDir, { recursive: true });

  const chineseFile = path.join(sessionDir, "chinese.txt");
  const englishFile = path.join(sessionDir, "english.txt");
  await fs.writeFile(chineseFile, "", "utf8");
  await fs.writeFile(englishFile, "", "utf8");

  const session: SermonSession = {
    id,
    startedAt: Date.now(),
    status: "recording",
    chineseFile,
    englishFile,
  };

  await writeActiveSession(session);
  return session;
}

export async function pauseSermonSession(): Promise<SermonSession | null> {
  const session = await getActiveSermonSession();

  if (!session || session.status !== "recording") {
    return session;
  }

  session.status = "paused";
  await writeActiveSession(session);
  return session;
}

export async function resumeSermonSession(
  existing?: SermonSession
): Promise<SermonSession> {
  const session = existing ?? (await getActiveSermonSession());

  if (!session) {
    return startSermonSession();
  }

  session.status = "recording";
  await writeActiveSession(session);
  return session;
}

export async function endSermonSession(): Promise<SermonSession | null> {
  const session = await getActiveSermonSession();

  if (!session) {
    return null;
  }

  const ended: SermonSession = {
    ...session,
    status: "ended" satisfies SermonSessionStatus,
  };

  await fs.unlink(activeSessionPath()).catch(() => {});

  return ended;
}

export async function appendSermonSegment(
  chinese: string,
  english: string
): Promise<void> {
  const session = await getActiveSermonSession();

  if (!session || session.status !== "recording") {
    return;
  }

  const zh = chinese.trim();
  const en = english.trim();

  if (zh) {
    await fs.appendFile(session.chineseFile, `${zh} `, "utf8");
  }

  if (en) {
    await fs.appendFile(session.englishFile, `${en} `, "utf8");
  }
}
