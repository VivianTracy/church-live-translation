import { ApiError, GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { LIVE_SERMON_PROMPT } from "@/lib/translationPrompt";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function parseGeminiError(error: unknown): {
  message: string;
  status: number;
  geminiResponse: unknown;
} {
  if (error instanceof ApiError) {
    let geminiResponse: unknown = error.message;

    try {
      geminiResponse = JSON.parse(error.message);
    } catch {
      // Keep the raw message string when it is not JSON.
    }

    return {
      message: error.message,
      status: error.status,
      geminiResponse,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: 500,
      geminiResponse: null,
    };
  }

  return {
    message: String(error),
    status: 500,
    geminiResponse: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY is not configured",
          geminiResponse: null,
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const text = body.text;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing text", geminiResponse: null },
        { status: 400 }
      );
    }

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: text,
      config: {
        systemInstruction: LIVE_SERMON_PROMPT,
        temperature: 0,
        maxOutputTokens: 300,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    let translation = "";

    for await (const chunk of stream) {
      translation += chunk.text ?? "";
    }

    translation = translation.trim();

    if (!translation) {
      return NextResponse.json(
        {
          error: "Gemini returned no caption text",
          geminiResponse: null,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      translation,
    });
  } catch (error: unknown) {
    const parsed = parseGeminiError(error);
    console.error("Gemini error:", parsed);

    return NextResponse.json(
      {
        error: parsed.message,
        geminiResponse: parsed.geminiResponse,
      },
      { status: parsed.status }
    );
  }
}