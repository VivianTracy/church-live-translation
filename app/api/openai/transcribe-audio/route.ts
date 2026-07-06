import { NextRequest, NextResponse } from "next/server";
import {
  OPENAI_AUDIO_TRANSCRIPTION_MODEL,
  OPENAI_TRANSCRIPTION_LANGUAGE,
} from "@/lib/openaiModels";
import { requireOpenAIApiKey } from "@/lib/openaiServer";

export async function POST(request: NextRequest) {
  try {
    const apiKey = requireOpenAIApiKey();
    const body = await request.json();
    const audio = body.audio;

    if (!audio || typeof audio !== "string") {
      return NextResponse.json({ error: "Missing audio" }, { status: 400 });
    }

    const wavBytes = Buffer.from(audio, "base64");
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([wavBytes], { type: "audio/wav" }),
      "chunk.wav"
    );
    formData.append("model", OPENAI_AUDIO_TRANSCRIPTION_MODEL);
    formData.append("language", OPENAI_TRANSCRIPTION_LANGUAGE);
    formData.append("response_format", "text");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const responseText = await response.text();

    if (!response.ok) {
      let message = responseText;

      try {
        const parsed = JSON.parse(responseText) as {
          error?: { message?: string };
        };
        message = parsed.error?.message ?? responseText;
      } catch {
        // keep raw text
      }

      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json({
      transcript: responseText.trim(),
      model: OPENAI_AUDIO_TRANSCRIPTION_MODEL,
    });
  } catch (error) {
    console.error("OpenAI transcribe-audio error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "OpenAI transcription failed",
      },
      { status: 500 }
    );
  }
}
