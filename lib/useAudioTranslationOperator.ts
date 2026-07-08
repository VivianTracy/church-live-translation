"use client";

import {
  connectOpenAIAudioTranslation,
  type AudioTranslationConnection,
} from "@/lib/openaiAudioTranslationClient";
import {
  loadStoredAudioOutputDeviceId,
  saveStoredAudioOutputDeviceId,
} from "@/lib/audioOutputDeviceStorage";
import {
  loadStoredMicDeviceId,
  saveStoredMicDeviceId,
} from "@/lib/microphoneDeviceStorage";
import { startTranslationAudioBroadcast } from "@/lib/translationAudioBroadcast";
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

export function useAudioTranslationOperator(audienceLive = false) {
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [micDeviceId, setMicDeviceIdState] = useState("");
  const [outputDeviceId, setOutputDeviceIdState] = useState("");
  const [outputDeviceLabel, setOutputDeviceLabel] = useState("");
  const [micError, setMicError] = useState("");
  const [translationError, setTranslationError] = useState("");
  const [audienceBroadcastError, setAudienceBroadcastError] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [inputTranscript, setInputTranscript] = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");
  const [levels, setLevels] = useState<AudioLevels>(INITIAL_LEVELS);

  const connectionRef = useRef<AudioTranslationConnection | null>(null);
  const startingRef = useRef(false);
  const micDeviceIdRef = useRef("");
  const outputDeviceIdRef = useRef("");
  const sessionStartedAtRef = useRef<number | null>(null);
  const audienceLiveRef = useRef(audienceLive);
  const outputStreamRef = useRef<MediaStream | null>(null);
  const broadcastStopRef = useRef<(() => void) | null>(null);

  audienceLiveRef.current = audienceLive;

  const stopAudienceBroadcast = useCallback(() => {
    broadcastStopRef.current?.();
    broadcastStopRef.current = null;
  }, []);

  const startAudienceBroadcast = useCallback(
    (stream: MediaStream) => {
      stopAudienceBroadcast();
      broadcastStopRef.current = startTranslationAudioBroadcast(
        stream,
        setAudienceBroadcastError
      );
    },
    [stopAudienceBroadcast]
  );

  useEffect(() => {
    const storedMicId = loadStoredMicDeviceId();
    const storedOutputId = loadStoredAudioOutputDeviceId();
    micDeviceIdRef.current = storedMicId;
    outputDeviceIdRef.current = storedOutputId;
    setMicDeviceIdState(storedMicId);
    setOutputDeviceIdState(storedOutputId);
  }, []);

  useEffect(() => {
    return () => {
      stopAudienceBroadcast();
      connectionRef.current?.stop();
      connectionRef.current = null;
    };
  }, [stopAudienceBroadcast]);

  useEffect(() => {
    if (!audienceLive) {
      stopAudienceBroadcast();
      return;
    }

    if (outputStreamRef.current && isListening) {
      startAudienceBroadcast(outputStreamRef.current);
    }
  }, [audienceLive, isListening, startAudienceBroadcast, stopAudienceBroadcast]);

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
    if (!isListening || !connectionRef.current || !outputDeviceId) {
      return;
    }

    void connectionRef.current.setOutputDeviceId(outputDeviceId);
  }, [isListening, outputDeviceId]);

  const resetSessionState = useCallback(() => {
    setLevels(INITIAL_LEVELS);
    setInputTranscript("");
    setOutputTranscript("");
    setLatencyMs(null);
    sessionStartedAtRef.current = null;
    outputStreamRef.current = null;
    stopAudienceBroadcast();
  }, [stopAudienceBroadcast]);

  const stopListening = useCallback(() => {
    stopAudienceBroadcast();
    connectionRef.current?.stop();
    connectionRef.current = null;
    startingRef.current = false;
    setIsListening(false);
    setIsTranslating(false);
    resetSessionState();
  }, [resetSessionState, stopAudienceBroadcast]);

  const startListening = useCallback(async () => {
    if (connectionRef.current || startingRef.current) {
      return Boolean(connectionRef.current);
    }

    startingRef.current = true;
    setMicError("");
    setTranslationError("");
    setAudienceBroadcastError("");
    resetSessionState();

    try {
      const startedAt = Date.now();
      sessionStartedAtRef.current = startedAt;

      connectionRef.current = await connectOpenAIAudioTranslation({
        deviceId: micDeviceIdRef.current || undefined,
        outputDeviceId: outputDeviceIdRef.current || undefined,
        onListeningChange: setIsListening,
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
        onTranslatedStream: (stream) => {
          outputStreamRef.current = stream;

          if (audienceLiveRef.current) {
            startAudienceBroadcast(stream);
          }
        },
        onError: (message) => {
          setTranslationError(message);
        },
      });

      startingRef.current = false;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMicError(message);
      setIsListening(false);
      setIsTranslating(false);
      connectionRef.current = null;
      startingRef.current = false;
      resetSessionState();
      return false;
    }
  }, [resetSessionState, startAudienceBroadcast]);

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

  return {
    translationStatusLabel: "OpenAI gpt-realtime-translate (Chinese → English audio)",
    isListening,
    isTranslating,
    micDeviceId,
    setMicDeviceId,
    outputDeviceId,
    setOutputDeviceId,
    outputDeviceLabel,
    micError,
    translationError,
    audienceBroadcastError,
    latencyMs,
    inputTranscript,
    outputTranscript,
    inputLevel: levels.inputLevel,
    inputPeak: levels.inputPeak,
    outputLevel: levels.outputLevel,
    outputPeak: levels.outputPeak,
    startListening,
    stopListening,
    restartListening,
  };
}
