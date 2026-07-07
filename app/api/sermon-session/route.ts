import {
  appendSermonSegment,
  endSermonSession,
  getActiveSermonSession,
  pauseSermonSession,
  resumeSermonSession,
  startSermonSession,
} from "@/lib/sermonTranscriptStorage";
import type { SermonSessionRequest } from "@/types/sermonSession";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await getActiveSermonSession();
  return NextResponse.json(session);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SermonSessionRequest;

  try {
    switch (body.action) {
      case "start": {
        const session = await startSermonSession();
        return NextResponse.json(session);
      }
      case "pause": {
        const session = await pauseSermonSession();
        return NextResponse.json(session);
      }
      case "resume": {
        const session = await resumeSermonSession();
        return NextResponse.json(session);
      }
      case "end": {
        const session = await endSermonSession();
        return NextResponse.json(session);
      }
      case "append": {
        await appendSermonSegment(body.chinese, body.english);
        const session = await getActiveSermonSession();
        return NextResponse.json(session);
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
