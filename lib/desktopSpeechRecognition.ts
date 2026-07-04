type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = {
  error: SpeechRecognitionErrorCode;
  message?: string;
};

type SpeechRecognitionErrorCode =
  | "aborted"
  | "audio-capture"
  | "bad-grammar"
  | "language-not-supported"
  | "network"
  | "no-speech"
  | "not-allowed"
  | "service-not-allowed";

const BENIGN_ERRORS = new Set<SpeechRecognitionErrorCode>([
  "no-speech",
  "aborted",
]);

function getSpeechRecognitionConstructor():
  | (new () => SpeechRecognitionInstance)
  | undefined {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function describeSpeechError(error: SpeechRecognitionErrorCode): string {
  switch (error) {
    case "not-allowed":
      return "Microphone permission denied. Allow microphone access and try again.";
    case "service-not-allowed":
      return "Speech recognition is not allowed in this browser context.";
    case "network":
      return "Speech recognition lost network access. Check your internet connection.";
    case "audio-capture":
      return "Could not capture audio from the microphone.";
    case "language-not-supported":
      return "Chinese speech recognition is not supported in this browser.";
    default:
      return `Speech recognition error: ${error}`;
  }
}

export type DesktopSpeechRecognitionCallbacks = {
  onTranscript: (finalText: string, displayText: string) => void;
  onListeningChange: (isListening: boolean) => void;
  onError: (message: string) => void;
};

export function createDesktopSpeechRecognition(
  callbacks: DesktopSpeechRecognitionCallbacks
) {
  let recognition: SpeechRecognitionInstance | null = null;
  let shouldListen = false;

  const startRecognition = () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition || !shouldListen) {
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      callbacks.onListeningChange(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      callbacks.onTranscript(
        finalTranscript.trim(),
        finalTranscript || interimTranscript
      );
    };

    recognition.onerror = (event) => {
      if (BENIGN_ERRORS.has(event.error)) {
        return;
      }

      shouldListen = false;
      callbacks.onListeningChange(false);
      callbacks.onError(describeSpeechError(event.error));
    };

    recognition.onend = () => {
      recognition = null;

      if (shouldListen) {
        window.setTimeout(startRecognition, 250);
        return;
      }

      callbacks.onListeningChange(false);
    };

    recognition.start();
  };

  return {
    start() {
      const SpeechRecognition = getSpeechRecognitionConstructor();

      if (!SpeechRecognition) {
        return {
          ok: false as const,
          error:
            "Speech recognition is not supported in this browser. Please use Chrome.",
        };
      }

      shouldListen = true;
      startRecognition();

      return { ok: true as const };
    },

    stop() {
      shouldListen = false;
      recognition?.stop();
    },
  };
}
