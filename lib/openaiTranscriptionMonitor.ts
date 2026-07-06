export type WhisperLogLevel = "info" | "warn" | "error";

export type WhisperLogEntry = {
  at: number;
  level: WhisperLogLevel;
  message: string;
};

export type WhisperMonitorSnapshot = {
  connectionState: "idle" | "connecting" | "open" | "closed" | "error";
  sessionReady: boolean;
  websocketState: "connecting" | "open" | "closing" | "closed" | "unknown";
  appendCount: number;
  commitCount: number;
  clearCount: number;
  commitSkippedCount: number;
  deltaCount: number;
  completedCount: number;
  emptyCompletedCount: number;
  segmentCount: number;
  serverEventCount: number;
  errorCount: number;
  ignoredErrorCount: number;
  hasAudioSinceClear: boolean;
  awaitingTranscription: boolean;
  lastServerEvent?: string;
  lastServerEventAt?: number;
  lastClientEvent?: string;
  lastClientEventAt?: number;
  lastError?: string;
  lastCommitSkippedReason?: string;
  micLabel?: string;
  micReadyState?: string;
  audioContextState?: string;
  lastChunkRms?: number;
  lastChunkPeak?: number;
  logs: WhisperLogEntry[];
};

const MAX_LOGS = 40;

export function createWhisperMonitor(
  onUpdate: (snapshot: WhisperMonitorSnapshot) => void
) {
  const snapshot: WhisperMonitorSnapshot = {
    connectionState: "idle",
    sessionReady: false,
    websocketState: "unknown",
    appendCount: 0,
    commitCount: 0,
    clearCount: 0,
    commitSkippedCount: 0,
    deltaCount: 0,
    completedCount: 0,
    emptyCompletedCount: 0,
    segmentCount: 0,
    serverEventCount: 0,
    errorCount: 0,
    ignoredErrorCount: 0,
    hasAudioSinceClear: false,
    awaitingTranscription: false,
    logs: [],
  };

  const publish = () => {
    onUpdate({
      ...snapshot,
      logs: [...snapshot.logs],
    });
  };

  const log = (level: WhisperLogLevel, message: string) => {
    snapshot.logs.unshift({
      at: Date.now(),
      level,
      message,
    });

    if (snapshot.logs.length > MAX_LOGS) {
      snapshot.logs.length = MAX_LOGS;
    }

    if (level === "error") {
      snapshot.lastError = message;
    }

    publish();
  };

  return {
    reset() {
      snapshot.connectionState = "idle";
      snapshot.sessionReady = false;
      snapshot.websocketState = "unknown";
      snapshot.appendCount = 0;
      snapshot.commitCount = 0;
      snapshot.clearCount = 0;
      snapshot.commitSkippedCount = 0;
      snapshot.deltaCount = 0;
      snapshot.completedCount = 0;
      snapshot.emptyCompletedCount = 0;
      snapshot.segmentCount = 0;
      snapshot.serverEventCount = 0;
      snapshot.errorCount = 0;
      snapshot.ignoredErrorCount = 0;
      snapshot.hasAudioSinceClear = false;
      snapshot.awaitingTranscription = false;
      snapshot.lastServerEvent = undefined;
      snapshot.lastServerEventAt = undefined;
      snapshot.lastClientEvent = undefined;
      snapshot.lastClientEventAt = undefined;
      snapshot.lastError = undefined;
      snapshot.lastCommitSkippedReason = undefined;
      snapshot.logs = [];
      publish();
    },

    setConnectionState(state: WhisperMonitorSnapshot["connectionState"]) {
      snapshot.connectionState = state;
      publish();
    },

    setWebsocketState(state: WhisperMonitorSnapshot["websocketState"]) {
      snapshot.websocketState = state;
      publish();
    },

    setSessionReady(ready: boolean) {
      snapshot.sessionReady = ready;
      publish();
    },

    setBufferState(input: {
      hasAudioSinceClear?: boolean;
      awaitingTranscription?: boolean;
    }) {
      if (input.hasAudioSinceClear !== undefined) {
        snapshot.hasAudioSinceClear = input.hasAudioSinceClear;
      }

      if (input.awaitingTranscription !== undefined) {
        snapshot.awaitingTranscription = input.awaitingTranscription;
      }

      publish();
    },

    setMicState(input: {
      micLabel?: string;
      micReadyState?: string;
      audioContextState?: string;
    }) {
      if (input.micLabel !== undefined) {
        snapshot.micLabel = input.micLabel;
      }

      if (input.micReadyState !== undefined) {
        snapshot.micReadyState = input.micReadyState;
      }

      if (input.audioContextState !== undefined) {
        snapshot.audioContextState = input.audioContextState;
      }

      publish();
    },

    setChunkLevel(input: { rms: number; peak: number }) {
      snapshot.lastChunkRms = input.rms;
      snapshot.lastChunkPeak = input.peak;
      publish();
    },

    clientEvent(type: string, detail?: string) {
      snapshot.lastClientEvent = type;
      snapshot.lastClientEventAt = Date.now();

      if (type === "input_audio_buffer.append") {
        snapshot.appendCount += 1;

        if (snapshot.appendCount === 1 || snapshot.appendCount % 25 === 0) {
          log("info", `Sent append #${snapshot.appendCount}${detail ? `: ${detail}` : ""}`);
        }
      } else if (type === "input_audio_buffer.commit") {
        snapshot.commitCount += 1;
        log("info", `Sent commit #${snapshot.commitCount}${detail ? `: ${detail}` : ""}`);
      } else if (type === "input_audio_buffer.clear") {
        snapshot.clearCount += 1;
        log("info", `Sent clear #${snapshot.clearCount}${detail ? `: ${detail}` : ""}`);
      } else if (type === "pcm-chunk") {
        snapshot.appendCount += 1;
        log("info", `PCM chunk #${snapshot.appendCount}${detail ? `: ${detail}` : ""}`);
      } else if (type === "transcribe-audio") {
        snapshot.commitCount += 1;
        log("info", `REST transcribe #${snapshot.commitCount}${detail ? `: ${detail}` : ""}`);
      } else {
        log("info", `Client event ${type}${detail ? `: ${detail}` : ""}`);
      }

      publish();
    },

    commitSkipped(reason: string) {
      snapshot.commitSkippedCount += 1;
      snapshot.lastCommitSkippedReason = reason;

      if (snapshot.commitSkippedCount === 1 || snapshot.commitSkippedCount % 5 === 0) {
        log("warn", `Commit skipped (${snapshot.commitSkippedCount}x): ${reason}`);
      }

      publish();
    },

    serverEvent(type: string, detail?: string) {
      snapshot.serverEventCount += 1;
      snapshot.lastServerEvent = type;
      snapshot.lastServerEventAt = Date.now();

      if (type.includes("delta")) {
        snapshot.deltaCount += 1;
      }

      if (type.includes("completed")) {
        snapshot.completedCount += 1;
      }

      if (
        type === "session.created" ||
        type === "session.updated" ||
        type.includes("completed") ||
        type === "error" ||
        type === "input_audio_buffer.committed" ||
        snapshot.serverEventCount <= 8 ||
        snapshot.serverEventCount % 10 === 0
      ) {
        log("info", `Server ${type}${detail ? `: ${detail}` : ""}`);
      }

      publish();
    },

    emptyCompleted(itemId?: string) {
      snapshot.emptyCompletedCount += 1;
      log(
        "warn",
        `Empty completed #${snapshot.emptyCompletedCount}${itemId ? ` (${itemId})` : ""} — keeping audio buffer`
      );
      publish();
    },

    segmentFinished(text: string) {
      snapshot.segmentCount += 1;
      log(
        "info",
        `Segment #${snapshot.segmentCount} (${text.length} chars): ${text.slice(0, 48)}${text.length > 48 ? "…" : ""}`
      );
      publish();
    },

    apiError(message: string, ignored = false) {
      if (ignored) {
        snapshot.ignoredErrorCount += 1;
        log("warn", `Ignored API error: ${message}`);
      } else {
        snapshot.errorCount += 1;
        log("error", message);
      }

      publish();
    },

    info(message: string) {
      log("info", message);
    },

    warn(message: string) {
      log("warn", message);
    },

    error(message: string) {
      log("error", message);
    },
  };
}

export type WhisperMonitor = ReturnType<typeof createWhisperMonitor>;

export function formatWhisperTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
