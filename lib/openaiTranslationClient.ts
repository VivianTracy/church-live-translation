import { OPENAI_REALTIME_WEBSOCKET_URL } from "@/lib/openaiModels";

type TranslationCallbacks = {
  onCaptionDelta?: (delta: string, caption: string) => void;
  onError?: (message: string) => void;
};

type TranslationSession = {
  translateChinese: (chinese: string) => Promise<string>;
  close: () => void;
};

export async function connectOpenAITranslation(
  callbacks: TranslationCallbacks = {}
): Promise<TranslationSession> {
  const sessionResponse = await fetch("/api/openai/translation-session", {
    method: "POST",
  });

  const sessionData = (await sessionResponse.json()) as {
    clientSecret?: string;
    model?: string;
    error?: string;
  };

  if (!sessionResponse.ok || !sessionData.clientSecret || !sessionData.model) {
    throw new Error(
      sessionData.error ?? "Could not create OpenAI translation session."
    );
  }

  const websocket = new WebSocket(
    `${OPENAI_REALTIME_WEBSOCKET_URL}?model=${encodeURIComponent(sessionData.model)}`,
    [
      "realtime",
      `openai-insecure-api-key.${sessionData.clientSecret}`,
      "openai-beta.realtime-v1",
    ]
  );

  let captionBuffer = "";
  let pendingResolve: ((caption: string) => void) | null = null;
  let pendingReject: ((error: Error) => void) | null = null;

  await new Promise<void>((resolve, reject) => {
    websocket.onopen = () => resolve();
    websocket.onerror = () =>
      reject(new Error("OpenAI translation websocket failed to connect."));
  });

  websocket.onmessage = ({ data }) => {
    const event = JSON.parse(data as string) as {
      type?: string;
      delta?: string;
      message?: string;
    };

    if (event.type === "response.output_text.delta") {
      captionBuffer += event.delta ?? "";
      callbacks.onCaptionDelta?.(event.delta ?? "", captionBuffer);
      return;
    }

    if (event.type === "response.output_text.done") {
      const caption = captionBuffer.trim();
      captionBuffer = "";
      pendingResolve?.(caption);
      pendingResolve = null;
      pendingReject = null;
      return;
    }

    if (event.type === "error") {
      const message = event.message ?? "OpenAI translation error";
      callbacks.onError?.(message);
      pendingReject?.(new Error(message));
      pendingResolve = null;
      pendingReject = null;
    }
  };

  return {
    translateChinese(chinese: string) {
      const cleanText = chinese.trim();

      if (!cleanText) {
        return Promise.resolve("");
      }

      if (websocket.readyState !== WebSocket.OPEN) {
        return Promise.reject(
          new Error("OpenAI translation session is not connected.")
        );
      }

      if (pendingResolve || pendingReject) {
        return Promise.reject(
          new Error("OpenAI translation is already in progress.")
        );
      }

      captionBuffer = "";

      return new Promise<string>((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;

        websocket.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: cleanText }],
            },
          })
        );

        websocket.send(JSON.stringify({ type: "response.create" }));
      });
    },

    close() {
      websocket.close();
    },
  };
}
