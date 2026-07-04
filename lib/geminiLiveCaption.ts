import { GoogleGenAI } from "@google/genai";
import {
  buildLiveUtteranceMessage,
  buildSermonReferenceSetupMessage,
} from "@/lib/serviceContextPrompt";
import { LIVE_CAPTION_MODEL } from "@/lib/translationPromptLive";

export type GeminiLiveCaptionCallbacks = {
  onCaption: (text: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onClose: (reason?: string) => void;
};

type ConnectGeminiLiveCaptionOptions = {
  sermonText?: string;
};

export async function connectGeminiLiveCaption(
  callbacks: GeminiLiveCaptionCallbacks,
  options: ConnectGeminiLiveCaptionOptions = {}
) {
  const sermonText = options.sermonText?.trim() ?? "";
  const hasSermonContext = sermonText.length > 0;
  let acceptCaptions = !hasSermonContext;

  const tokenResponse = await fetch("/api/live/token", { method: "POST" });

  if (!tokenResponse.ok) {
    const data = await tokenResponse.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create Live API token");
  }

  const { token, model } = (await tokenResponse.json()) as {
    token: string;
    model: string;
  };

  const ai = new GoogleGenAI({
    apiKey: token,
    httpOptions: { apiVersion: "v1alpha" },
  });

  let latestText = "";

  const session = await ai.live.connect({
    model: model || LIVE_CAPTION_MODEL,
    callbacks: {
      onopen: () => {},
      onmessage: (message) => {
        if (!acceptCaptions) {
          return;
        }

        const content = message.serverContent;
        if (!content) {
          return;
        }

        const parts = content.modelTurn?.parts ?? [];
        const text = parts
          .map((part) => part.text ?? "")
          .join("")
          .trim();

        if (text) {
          latestText = text;
          callbacks.onCaption(text, Boolean(content.turnComplete));
        }

        if (content.turnComplete && latestText) {
          callbacks.onCaption(latestText, true);
          latestText = "";
        }
      },
      onerror: (event) => {
        callbacks.onError(event.message || "Live API error");
      },
      onclose: (event) => {
        const reason =
          typeof event === "object" &&
          event !== null &&
          "reason" in event &&
          typeof event.reason === "string"
            ? event.reason
            : undefined;
        callbacks.onClose(reason);
      },
    },
  });

  if (hasSermonContext) {
    session.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [{ text: buildSermonReferenceSetupMessage(sermonText) }],
        },
      ],
      turnComplete: true,
    });
  }

  return {
    translateChinese(chinese: string) {
      acceptCaptions = true;
      session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text: buildLiveUtteranceMessage(chinese) }],
          },
        ],
        turnComplete: true,
      });
    },
    canAcceptCaption() {
      return acceptCaptions;
    },
    close() {
      session.close();
    },
  };
}
