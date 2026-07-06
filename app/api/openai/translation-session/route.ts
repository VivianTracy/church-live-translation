import { NextResponse } from "next/server";
import { OPENAI_TRANSLATION_MODEL } from "@/lib/openaiModels";
import { OPENAI_SERMON_TRANSLATION_INSTRUCTIONS } from "@/lib/openaiSermonTranslationPrompt";
import {
  buildSystemInstructionWithSermonRules,
  readServiceContext,
} from "@/lib/serviceContext";
import { createOpenAIClientSecret, getOpenAIApiKey } from "@/lib/openaiServer";

export async function POST() {
  if (!getOpenAIApiKey()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const serviceContext = await readServiceContext();
    const instructions = buildSystemInstructionWithSermonRules(
      OPENAI_SERMON_TRANSLATION_INSTRUCTIONS,
      serviceContext.sermonText.length > 0
    );

    const secret = await createOpenAIClientSecret({
      type: "realtime",
      model: OPENAI_TRANSLATION_MODEL,
      instructions,
      output_modalities: ["text"],
      temperature: 0,
    });

    return NextResponse.json({
      clientSecret: secret.value,
      expiresAt: secret.expiresAt,
      model: OPENAI_TRANSLATION_MODEL,
    });
  } catch (error) {
    console.error("OpenAI translation session error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create translation session",
      },
      { status: 500 }
    );
  }
}
