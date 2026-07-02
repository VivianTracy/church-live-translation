import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

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
      contents: `
Translate this Chinese sermon transcript into natural English captions.

Rules:
- Output English only.
- Keep it concise for live captions.
- Preserve biblical terminology.
- Do not add anything not present in the Chinese.

Chinese:
${text}
`,
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