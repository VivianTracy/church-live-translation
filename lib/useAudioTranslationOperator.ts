"use client";

import { saveCaptionState } from "@/lib/captionApi";
import {
  connectOpenAIAudioTranslation,
  type AudioTranslationConnection,
} from "@/lib/openaiAudioTranslationClient";
import { connectOpenAITranscription } from "@/lib/openaiTranscriptionClient";
import {
  OpenAITranslationError,
  translateChineseToEnglishOpenAI,
} from "@/lib/openaiTranslate";
import {
  loadStoredAudioOutputDeviceId,
  saveStoredAudioOutputDeviceId,
} from "@/lib/audioOutputDeviceStorage";
import {
  loadStoredMicDeviceId,
  saveStoredMicDeviceId,
} from "@/lib/microphoneDeviceStorage";
import {
  loadStoredOutputMode,
  outputModeIncludesAudio,
  outputModeIncludesCaptions,
  saveStoredOutputMode,
  type OutputMode,
} from "@/lib/outputModeStorage";
import { useCallback, useEffect, useRef, useState } from "react";

type AudioLevels = {
  inputLevel: number;
  inputPeak: number;
  outputLevel: number;
  outputPeak: number;
};

const INITIAL_LEVELS: AudioLevels = {
  inputLevel: 0,
  inputPeak: 0,
  outputLevel: 0,
  outputPeak: 0,
};

export function useAudioTranslationOperator() {
  const [outputMode, setOutputModeState] = useState<OutputMode>("both");
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCaptionTranslating, setIsCaptionTranslating] = useState(false);
  const [micDeviceId, setMicDeviceIdState] = useState("");
  const [outputDeviceId, setOutputDeviceIdState] = useState("");
  const [outputDeviceLabel, setOutputDeviceLabel] = useState("");
  const [micError, setMicError] = useState("");
  const [translationError, setTranslationError] = useState("");
  const [captionError, setCaptionError] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [inputTranscript, setInputTranscript] = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");
  const [micTranscript, setMicTranscript] = useState("");
  const [englishCaption, setEnglishCaption] = useState("");
  const [englishCaptionUpdatedAt, setEnglishCaptionUpdatedAt] = useState(0);
  const [levels, setLevels] = useState<AudioLevels>(INITIAL_LEVELS);

  const audioConnectionRef = useRef<AudioTranslationConnection | null>(null);
  const transcriptionRef = useRef<Awaited<
    ReturnType<typeof connectOpenAITranscription>
  > | null>(null);
  const micDeviceIdRef = useRef("");
  const outputDeviceIdRef = useRef("");
  const outputModeRef = useRef<OutputMode>("both");
  const sessionStartedAtRef = useRef<number | null>(null);
  const liveBroadcastRef = useRef(false);
  const englishPartsRef = useRef<string[]>([]);
  const captionTranslationQueueRef = useRef(Promise.resolve());

  outputModeRef.current = outputMode;

  useEffect(() => {
    const storedMicId = loadStoredMicDeviceId();
    const storedOutputId = loadStoredAudioOutputDeviceId();
    const storedOutputMode = loadStoredOutputMode();
    micDeviceIdRef.current = storedMicId;
    outputDeviceIdRef.current = storedOutputId;
    outputModeRef.current = storedOutputMode;
    setMicDeviceIdState(storedMicId);
    setOutputDeviceIdState(storedOutputId);
    setOutputModeState(storedOutputMode);
  }, []);

  useEffect(() => {
    return () => {
      audioConnectionRef.current?.stop();
      audioConnectionRef.current = null;
      transcriptionRef.current?.stop();
      transcriptionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!outputDeviceId || !navigator.mediaDevices?.enumerateDevices) {
      setOutputDeviceLabel("");
      return;
    }

    let cancelled = false;

    void navigator.mediaDevices.enumerateDevices().then((devices) => {
      if (cancelled) {
        return;
      }

      const match = devices.find((device) => device.deviceId === outputDeviceId);
      setOutputDeviceLabel(match?.label || "Selected output");
    });

    return () => {
      cancelled = true;
    };
  }, [outputDeviceId]);

  useEffect(() => {
    if (!isListening || !audioConnectionRef.current || !outputDeviceId) {
      return;
    }

    void audioConnectionRef.current.setOutputDeviceId(outputDeviceId);
  }, [isListening, outputDeviceId]);

  const resetSessionState = useCallback(() => {
    setLevels(INITIAL_LEVELS);
    setInputTranscript("");
    setOutputTranscript("");
    setMicTranscript("");
    setEnglishCaption("");
    setEnglishCaptionUpdatedAt(0);
    setLatencyMs(null);
    englishPartsRef.current = [];
    captionTranslationQueueRef.current = Promise.resolve();
    sessionStartedAtRef.current = null;
  }, []);

  const startBroadcast = useCallback(async () => {
    liveBroadcastRef.current = true;

    await saveCaptionState({
      isLive: true,
      caption: englishPartsRef.current.join(" "),
      updatedAt: Date.now(),
    });
  }, []);

  const clearBroadcast = useCallback(async () => {
    liveBroadcastRef.current = false;
    resetSessionState();

    await saveCaptionState({
      isLive: false,
      caption: "",
      updatedAt: Date.now(),
    });
  }, [resetSessionState]);

  const translateCaptionSegment = useCallback((chinese: string) => {
    captionTranslationQueueRef.current = captionTranslationQueueRef.current
      .then(async () => {
        setIsCaptionTranslating(true);

        try {
          const english = await translateChineseToEnglishOpenAI(chinese);
          englishPartsRef.current.push(english);
          const fullCaption = englishPartsRef.current.join(" ");
          setEnglishCaption(fullCaption);
          setEnglishCaptionUpdatedAt(Date.now());
          setCaptionError("");

          if (liveBroadcastRef.current) {
            await saveCaptionState({
              isLive: true,
              caption: fullCaption,
              updatedAt: Date.now(),
            });
          }
        } catch (error) {
          const message =
            error instanceof OpenAITranslationError
              ? error.message
              : error instanceof Error
                ? error.message
                : String(error);
          setCaptionError(message);
          throw error;
        } finally {
          setIsCaptionTranslating(false);
        }
      })
      .catch((error) => {
        console.error("Caption translation failed:", error);
      });
  }, []);

  const stopAudioConnection = useCallback(() => {
    audioConnectionRef.current?.stop();
    audioConnectionRef.current = null;
  }, []);

  const stopCaptionConnection = useCallback(() => {
    transcriptionRef.current?.stop();
    transcriptionRef.current = null;
  }, []);

  const stopListening = useCallback(() => {
    stopAudioConnection();
    stopCaptionConnection();
    setIsListening(false);
    setIsTranslating(false);
    setIsCaptionTranslating(false);
    resetSessionState();
  }, [resetSessionState, stopAudioConnection, stopCaptionConnection]);

  const startCaptionConnection = useCallback(async () => {
    transcriptionRef.current = await connectOpenAITranscription({
      deviceId: micDeviceIdRef.current || undefined,
      onDisplay: setMicTranscript,
      onSegment: translateCaptionSegment,
      onListeningChange: () => undefined,
      onError: (message) => {
        setCaptionError(message);
      },
      onMonitorUpdate: (snapshot) => {
        if (!outputModeIncludesAudio(outputModeRef.current)) {
          setLevels((current) => ({
            ...current,
            inputLevel: snapshot.lastChunkRms ?? current.inputLevel,
            inputPeak: snapshot.lastChunkPeak ?? current.inputPeak,
          }));
        }
      },
    });
  }, [translateCaptionSegment]);

  const startAudioConnection = useCallback(async () => {
    const startedAt = Date.now();
    sessionStartedAtRef.current = startedAt;

    audioConnectionRef.current = await connectOpenAIAudioTranslation({
      deviceId: micDeviceIdRef.current || undefined,
      outputDeviceId: outputDeviceIdRef.current || undefined,
      onListeningChange: () => undefined,
      onTranslatingChange: setIsTranslating,
      onInputLevels: (inputLevel, inputPeak) => {
        setLevels((current) => ({
          ...current,
          inputLevel,
          inputPeak,
        }));
      },
      onOutputLevels: (outputLevel, outputPeak) => {
        setLevels((current) => ({
          ...current,
          outputLevel,
          outputPeak,
        }));
      },
      onFirstOutputAudio: () => {
        if (sessionStartedAtRef.current !== null) {
          setLatencyMs(Date.now() - sessionStartedAtRef.current);
        }
      },
      onInputTranscriptDelta: (delta) => {
        setInputTranscript((current) => current + delta);
      },
      onOutputTranscriptDelta: (delta) => {
        setOutputTranscript((current) => current + delta);
      },
      onError: (message) => {
        setTranslationError(message);
      },
    });
  }, []);

  const startListening = useCallback(async () => {
    if (audioConnectionRef.current || transcriptionRef.current) {
      return true;
    }

    const mode = outputModeRef.current;
    const includesAudio = outputModeIncludesAudio(mode);
    const includesCaptions = outputModeIncludesCaptions(mode);

    setMicError("");
    setTranslationError("");
    setCaptionError("");
    resetSessionState();

    try {
      if (includesCaptions) {
        await startCaptionConnection();
      }

      if (includesAudio) {
        await startAudioConnection();
      }

      setIsListening(true);
      return true;
    } catch (error) {
      stopAudioConnection();
      stopCaptionConnection();
      const message = error instanceof Error ? error.message : String(error);
      setMicError(message);
      setIsListening(false);
      setIsTranslating(false);
      resetSessionState();
      return false;
    }
  }, [
    resetSessionState,
    startAudioConnection,
    startCaptionConnection,
    stopAudioConnection,
    stopCaptionConnection,
  ]);

  const restartListening = useCallback(async () => {
    stopListening();
    return startListening();
  }, [startListening, stopListening]);

  const setMicDeviceId = useCallback((deviceId: string) => {
    micDeviceIdRef.current = deviceId;
    setMicDeviceIdState(deviceId);
    saveStoredMicDeviceId(deviceId);
  }, []);

  const setOutputDeviceId = useCallback((deviceId: string) => {
    outputDeviceIdRef.current = deviceId;
    setOutputDeviceIdState(deviceId);
    saveStoredAudioOutputDeviceId(deviceId);
  }, []);

  const setOutputMode = useCallback((mode: OutputMode) => {
    outputModeRef.current = mode;
    setOutputModeState(mode);
    saveStoredOutputMode(mode);
  }, []);

  const translationStatusLabel =
    outputMode === "captions"
      ? "OpenAI gpt-4o-mini-transcribe + GPT-4o mini captions"
      : outputMode === "audio"
        ? "OpenAI gpt-realtime-translate (Chinese → English audio)"
        : "Captions + gpt-realtime-translate audio";

  return {
    outputMode,
    setOutputMode,
    translationStatusLabel,
    isListening,
    isTranslating: isTranslating || isCaptionTranslating,
    isAudioTranslating: isTranslating,
    isCaptionTranslating,
    micDeviceId,
    setMicDeviceId,
    outputDeviceId,
    setOutputDeviceId,
    outputDeviceLabel,
    micError,
    translationError,
    captionError,
    latencyMs,
    inputTranscript,
    outputTranscript,
    micTranscript,
    englishCaption,
    englishCaptionUpdatedAt,
    inputLevel: levels.inputLevel,
    inputPeak: levels.inputPeak,
    outputLevel: levels.outputLevel,
    outputPeak: levels.outputPeak,
    startListening,
    stopListening,
    restartListening,
    startBroadcast,
    clearBroadcast,
  };
}
