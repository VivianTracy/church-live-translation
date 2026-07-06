import { OPENAI_REALTIME_WEBSOCKET_URL } from "@/lib/openaiModels";

type RealtimeServerEvent = {
  type?: string;
  delta?: string;
  message?: string;
  error?: {
    type?: string;
    message?: string;
    code?: string;
  };
  response?: {
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string; transcript?: string }>;
    }>;
  };
};

type TranslationCallbacks = {
  onCaptionDelta?: (delta: string, caption: string) => void;
  onError?: (message: string) => void;
};

type TranslationSession = {
  translateChinese: (chinese: string) => Promise<string>;
  close: () => void;
};

type PendingRequest = {
  resolve: (caption: string) => void;
  reject: (error: Error) => void;
};

const TRANSLATION_TIMEOUT_MS = 20000;

function formatRealtimeError(event: RealtimeServerEvent): string {
  if (event.error?.message) {
    return event.error.message;
  }

  if (event.message) {
    return event.message;
  }

  if (event.type?.includes("error")) {
    return event.type;
  }

  return "OpenAI translation error";
}

function extractTextFromResponseDone(event: RealtimeServerEvent): string {
  const parts: string[] = [];

  for (const item of event.response?.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.text?.trim()) {
        parts.push(content.text.trim());
      } else if (content.transcript?.trim()) {
        parts.push(content.transcript.trim());
      }
    }
  }

  return parts.join(" ").trim();
}

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
    ["realtime", `openai-insecure-api-key.${sessionData.clientSecret}`]
  );

  let captionBuffer = "";
  let sessionReady = false;
  let pendingRequest: PendingRequest | null = null;
  let pendingTimeout: ReturnType<typeof setTimeout> | null = null;
  let requestQueue: Promise<void> = Promise.resolve();

  const clearPendingTimeout = () => {
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }
  };

  const finishPending = (caption: string) => {
    const request = pendingRequest;

    if (!request) {
      return;
    }

    clearPendingTimeout();
    pendingRequest = null;
    request.resolve(caption);
  };

  const failPending = (message: string) => {
    const request = pendingRequest;

    if (!request) {
      return;
    }

    clearPendingTimeout();
    pendingRequest = null;
    request.reject(new Error(message));
  };

  const handleServerError = (event: RealtimeServerEvent) => {
    const message = formatRealtimeError(event);
    console.error("OpenAI translation event:", event);
    callbacks.onError?.(message);
    failPending(message);
  };

  await new Promise<void>((resolve, reject) => {
    websocket.onopen = () => resolve();
    websocket.onerror = () =>
      reject(new Error("OpenAI translation websocket failed to connect."));
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("OpenAI translation session timed out while starting."));
    }, 10000);

    const onMessage = ({ data }: MessageEvent) => {
      const event = JSON.parse(data as string) as RealtimeServerEvent;

      if (event.type === "session.created") {
        sessionReady = true;
        clearTimeout(timeout);
        websocket.removeEventListener("message", onMessage);
        resolve();
      }

      if (event.type === "error" || event.type?.includes("error")) {
        clearTimeout(timeout);
        websocket.removeEventListener("message", onMessage);
        reject(new Error(formatRealtimeError(event)));
      }
    };

    websocket.addEventListener("message", onMessage);
  });

  websocket.onmessage = ({ data }) => {
    const event = JSON.parse(data as string) as RealtimeServerEvent;

    if (event.type === "response.output_text.delta") {
      captionBuffer += event.delta ?? "";
      callbacks.onCaptionDelta?.(event.delta ?? "", captionBuffer);
      return;
    }

    if (
      event.type === "response.output_text.done" ||
      event.type === "response.done"
    ) {
      const caption =
        event.type === "response.done"
          ? extractTextFromResponseDone(event) || captionBuffer.trim()
          : captionBuffer.trim();

      captionBuffer = "";

      if (pendingRequest) {
        finishPending(caption);
      }

      return;
    }

    if (event.type === "error" || event.type?.includes("error")) {
      handleServerError(event);
    }
  };

  websocket.send(
    JSON.stringify({
      type: "session.update",
      session: {
        type: "realtime",
        output_modalities: ["text"],
        audio: {
          input: {
            turn_detection: null,
          },
        },
      },
    })
  );

  const runTranslation = (chinese: string) =>
    new Promise<string>((resolve, reject) => {
      if (!sessionReady || websocket.readyState !== WebSocket.OPEN) {
        reject(new Error("OpenAI translation session is not connected."));
        return;
      }

      if (pendingRequest) {
        reject(new Error("OpenAI translation is already in progress."));
        return;
      }

      captionBuffer = "";
      pendingRequest = { resolve, reject };

      pendingTimeout = setTimeout(() => {
        failPending("OpenAI translation timed out.");
      }, TRANSLATION_TIMEOUT_MS);

      websocket.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: chinese }],
          },
        })
      );

      websocket.send(
        JSON.stringify({
          type: "response.create",
          response: {
            output_modalities: ["text"],
          },
        })
      );
    });

  return {
    translateChinese(chinese: string) {
      const cleanText = chinese.trim();

      if (!cleanText) {
        return Promise.resolve("");
      }

      const result = requestQueue.then(() => runTranslation(cleanText));
      requestQueue = result.then(
        () => undefined,
        () => undefined
      );

      return result;
    },

    close() {
      clearPendingTimeout();
      pendingRequest?.reject(new Error("OpenAI translation session closed."));
      pendingRequest = null;
      websocket.close();
    },
  };
}
