import { GoogleGenAI } from "@google/genai";
import { LIVE_CAPTION_MODEL } from "@/lib/translationPromptLive";

export type GeminiLiveCaptionCallbacks = {
  onOpen: () => void;
  onCaption: (text: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onClose: (reason?: string) => void;
};

export async function connectGeminiLiveCaption(
  callbacks: GeminiLiveCaptionCallbacks
) {
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
      onopen: () => {
        callbacks.onOpen();
      },
      onmessage: (message) => {
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

  return {
    translateChinese(chinese: string) {
      session.sendClientContent({
        turns: [{ role: "user", parts: [{ text: chinese }] }],
        turnComplete: true,
      });
    },
    close() {
      session.close();
    },
  };
}
