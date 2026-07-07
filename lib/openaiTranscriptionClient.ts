import {
  OPENAI_TRANSCRIPTION_CHUNK_MS,
  OPENAI_TRANSCRIPTION_MIN_RMS,
} from "@/lib/openaiModels";
import { getCaptionMicrophoneStream } from "@/lib/microphoneStream";
import {
  OpenAITranscriptionError,
  transcribeWavChunk,
} from "@/lib/openaiTranscribeAudio";
import {
  createWhisperMonitor,
  type WhisperMonitorSnapshot,
} from "@/lib/openaiTranscriptionMonitor";
import { startPcmChunkRecorder } from "@/lib/pcmAudioCapture";

type TranscriptionCallbacks = {
  onDisplay: (text: string) => void;
  onSegment: (text: string) => void;
  onListeningChange: (isListening: boolean) => void;
  onError: (message: string) => void;
  onMonitorUpdate?: (snapshot: WhisperMonitorSnapshot) => void;
  initialSegments?: string[];
  deviceId?: string;
};

type TranscriptionSession = {
  stop: () => void;
};

function joinParts(parts: string[]): string {
  return parts.filter(Boolean).join(" ").trim();
}

function isDuplicateSegment(segments: string[], next: string): boolean {
  const trimmed = next.trim();

  if (!trimmed) {
    return true;
  }

  return segments[segments.length - 1] === trimmed;
}

export async function connectOpenAITranscription(
  callbacks: TranscriptionCallbacks
): Promise<TranscriptionSession> {
  const monitor = createWhisperMonitor((snapshot) => {
    callbacks.onMonitorUpdate?.(snapshot);
  });

  monitor.reset();
  monitor.setConnectionState("connecting");
  monitor.info(
    `Starting REST chunk transcription (${OPENAI_TRANSCRIPTION_CHUNK_MS}ms chunks)`
  );

  const mic = await getCaptionMicrophoneStream(callbacks.deviceId);
  monitor.setMicState({
    micLabel: mic.label,
    micReadyState: mic.readyState,
  });
  monitor.info(
    `Microphone: ${mic.label} · ${mic.channelCount}ch · track=${mic.readyState}`
  );

  const completedSegments: string[] = [...(callbacks.initialSegments ?? [])];
  let transcriptionQueue = Promise.resolve();
  let stopped = false;
  let recorder: Awaited<ReturnType<typeof startPcmChunkRecorder>> | null = null;

  function updateDisplayFromSegments() {
    callbacks.onDisplay(joinParts(completedSegments));
  }

  if (completedSegments.length > 0) {
    updateDisplayFromSegments();
  }

  const enqueueChunk = (wavBase64: string, detail: string) => {
    transcriptionQueue = transcriptionQueue
      .then(async () => {
        if (stopped) {
          return;
        }

        monitor.clientEvent("transcribe-audio", detail);

        try {
          const transcript = await transcribeWavChunk(wavBase64);

          if (!transcript) {
            monitor.emptyCompleted();
            return;
          }

          if (isDuplicateSegment(completedSegments, transcript)) {
            monitor.warn(`Duplicate chunk ignored: ${transcript.slice(0, 40)}`);
            return;
          }

          completedSegments.push(transcript);
          monitor.segmentFinished(transcript);
          updateDisplayFromSegments();
          callbacks.onSegment(transcript);
        } catch (error) {
          const message =
            error instanceof OpenAITranscriptionError
              ? error.message
              : error instanceof Error
                ? error.message
                : String(error);
          monitor.apiError(message);
          callbacks.onError(message);
        }
      })
      .catch((error) => {
        console.error("OpenAI chunk transcription failed:", error);
      });
  };

  recorder = await startPcmChunkRecorder(
    mic.stream,
    OPENAI_TRANSCRIPTION_CHUNK_MS,
    OPENAI_TRANSCRIPTION_MIN_RMS,
    (wavBase64, stats) => {
      if (stopped) {
        return;
      }

      monitor.setChunkLevel({ rms: stats.rms, peak: stats.peak });
      monitor.setMicState({
        audioContextState: recorder?.getAudioContextState(),
      });

      monitor.clientEvent(
        "pcm-chunk",
        `${stats.durationMs}ms · rms=${stats.rms.toFixed(4)} · peak=${stats.peak.toFixed(4)} · buffers=${stats.bufferCount}`
      );

      if (!wavBase64) {
        if (stats.bufferCount === 0) {
          monitor.commitSkipped("no audio buffers captured (check mic / AudioContext)");
        } else {
          monitor.commitSkipped(
            `quiet chunk (rms=${stats.rms.toFixed(4)}, peak=${stats.peak.toFixed(4)} < ${OPENAI_TRANSCRIPTION_MIN_RMS})`
          );
        }
        return;
      }

      enqueueChunk(
        wavBase64,
        `${stats.durationMs}ms · rms=${stats.rms.toFixed(4)} · peak=${stats.peak.toFixed(4)}`
      );
    }
  );

  monitor.setMicState({
    audioContextState: recorder.getAudioContextState(),
  });
  monitor.setConnectionState("open");
  monitor.setWebsocketState("open");
  monitor.setSessionReady(true);
  monitor.info(`REST chunk recorder running · AudioContext=${recorder.getAudioContextState()}`);
  callbacks.onListeningChange(true);

  return {
    stop() {
      stopped = true;
      recorder?.stop();
      mic.stream.getTracks().forEach((track) => track.stop());
      monitor.setConnectionState("closed");
      monitor.info("Transcription session stopped");
      callbacks.onListeningChange(false);
    },
  };
}
