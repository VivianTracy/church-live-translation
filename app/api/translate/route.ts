import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { LIVE_SERMON_PROMPT } from "@/lib/translationPrompt";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body.text;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing text" },
        { status: 400 }
      );
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${LIVE_SERMON_PROMPT}

        Chinese:
        ${text}`,
        });

    return NextResponse.json({
      translation: response.text,
    });
  } catch (error) {
    console.error("Translation error:", error);

    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}