import { GoogleGenAI, Modality } from "@google/genai";
import { NextResponse } from "next/server";
import {
  LIVE_CAPTION_MODEL,
  LIVE_SERMON_PROMPT_COMPACT,
} from "@/lib/translationPromptLive";

export async function POST() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { apiVersion: "v1alpha" },
  });

  try {
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: LIVE_CAPTION_MODEL,
          config: {
            responseModalities: [Modality.TEXT],
            systemInstruction: LIVE_SERMON_PROMPT_COMPACT,
            temperature: 0,
            maxOutputTokens: 300,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        },
        lockAdditionalFields: [],
      },
    });

    return NextResponse.json({
      token: token.name,
      model: LIVE_CAPTION_MODEL,
    });
  } catch (error) {
    console.error("Live token error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Live API token",
      },
      { status: 500 }
    );
  }
}
