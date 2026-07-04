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

const RECOVERABLE_ERRORS = new Set<SpeechRecognitionErrorCode>(["network"]);

const RESTART_DELAY_MS = 350;
const STALL_TIMEOUT_MS = 12000;
const WATCHDOG_INTERVAL_MS = 4000;

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
      return "Speech recognition lost network access. Reconnecting...";
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
  onRecovering?: (message: string) => void;
};

export function createDesktopSpeechRecognition(
  callbacks: DesktopSpeechRecognitionCallbacks
) {
  let recognition: SpeechRecognitionInstance | null = null;
  let shouldListen = false;
  let restartTimer: number | null = null;
  let watchdogTimer: number | null = null;
  let lastResultAt = 0;
  let restartAttempts = 0;

  const clearRestartTimer = () => {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  const clearWatchdog = () => {
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  };

  const scheduleRestart = (delayMs = RESTART_DELAY_MS) => {
    clearRestartTimer();

    restartTimer = window.setTimeout(() => {
      restartTimer = null;
      startRecognition();
    }, delayMs);
  };

  const forceRestart = () => {
    if (!shouldListen) {
      return;
    }

    lastResultAt = Date.now();
    callbacks.onRecovering?.(
      "Speech recognition stalled. Restarting microphone..."
    );
    recognition?.abort();
    scheduleRestart(RESTART_DELAY_MS * 2);
  };

  const startWatchdog = () => {
    clearWatchdog();
    lastResultAt = Date.now();

    watchdogTimer = window.setInterval(() => {
      if (!shouldListen) {
        return;
      }

      if (Date.now() - lastResultAt > STALL_TIMEOUT_MS) {
        forceRestart();
      }
    }, WATCHDOG_INTERVAL_MS);
  };

  const startRecognition = () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition || !shouldListen) {
      return;
    }

    clearRestartTimer();
    recognition?.abort();
    recognition = null;

    try {
      recognition = new SpeechRecognition();
    } catch (error) {
      shouldListen = false;
      callbacks.onListeningChange(false);
      callbacks.onError(
        error instanceof Error
          ? error.message
          : "Could not start speech recognition."
      );
      return;
    }

    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      restartAttempts = 0;
      lastResultAt = Date.now();
      callbacks.onListeningChange(true);
    };

    recognition.onresult = (event) => {
      lastResultAt = Date.now();

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
        `${finalTranscript}${interimTranscript}`.trim()
      );
    };

    recognition.onerror = (event) => {
      if (BENIGN_ERRORS.has(event.error)) {
        return;
      }

      if (RECOVERABLE_ERRORS.has(event.error)) {
        callbacks.onRecovering?.(describeSpeechError(event.error));
        recognition?.stop();
        scheduleRestart(RESTART_DELAY_MS * Math.min(restartAttempts + 1, 4));
        restartAttempts += 1;
        return;
      }

      shouldListen = false;
      clearWatchdog();
      callbacks.onListeningChange(false);
      callbacks.onError(describeSpeechError(event.error));
    };

    recognition.onend = () => {
      recognition = null;

      if (shouldListen) {
        scheduleRestart();
        return;
      }

      clearWatchdog();
      callbacks.onListeningChange(false);
    };

    try {
      recognition.start();
    } catch (error) {
      restartAttempts += 1;

      if (restartAttempts <= 5) {
        scheduleRestart(RESTART_DELAY_MS * restartAttempts);
        return;
      }

      shouldListen = false;
      clearWatchdog();
      callbacks.onListeningChange(false);
      callbacks.onError(
        error instanceof Error
          ? error.message
          : "Could not restart speech recognition."
      );
    }
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
      restartAttempts = 0;
      startWatchdog();
      startRecognition();

      return { ok: true as const };
    },

    stop() {
      shouldListen = false;
      clearRestartTimer();
      clearWatchdog();
      recognition?.stop();
    },

    restart() {
      if (!getSpeechRecognitionConstructor()) {
        return {
          ok: false as const,
          error:
            "Speech recognition is not supported in this browser. Please use Chrome.",
        };
      }

      shouldListen = true;
      restartAttempts = 0;
      startWatchdog();
      forceRestart();

      return { ok: true as const };
    },
  };
}
