import { NextRequest, NextResponse } from "next/server";
import { OPENAI_CHAT_TRANSLATION_MODEL } from "@/lib/openaiModels";
import { OPENAI_SERMON_TRANSLATION_INSTRUCTIONS } from "@/lib/openaiSermonTranslationPrompt";
import { requireOpenAIApiKey } from "@/lib/openaiServer";

export async function POST(request: NextRequest) {
  try {
    const apiKey = requireOpenAIApiKey();
    const body = await request.json();
    const text = body.text;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const spokenChinese = text.trim();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_TRANSLATION_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: OPENAI_SERMON_TRANSLATION_INSTRUCTIONS },
          { role: "user", content: spokenChinese },
        ],
      }),
    });

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? "OpenAI translation failed" },
        { status: response.status }
      );
    }

    const translation = data.choices?.[0]?.message?.content?.trim() ?? "";

    if (!translation) {
      return NextResponse.json(
        { error: "OpenAI returned no caption text" },
        { status: 502 }
      );
    }

    return NextResponse.json({ translation });
  } catch (error) {
    console.error("OpenAI translate error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "OpenAI translation failed",
      },
      { status: 500 }
    );
  }
}
