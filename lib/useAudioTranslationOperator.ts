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

function deviceLabel(deviceId: string, devices: MediaDeviceInfo[], fallback: string) {
  if (!deviceId) {
    return fallback;
  }

  const match = devices.find((device) => device.deviceId === deviceId);
  return match?.label || fallback;
}

export function useAudioTranslationOperator() {
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [micDeviceId, setMicDeviceIdState] = useState("");
  const [outputDeviceId, setOutputDeviceIdState] = useState("");
  const [outputDeviceLabel, setOutputDeviceLabel] = useState("");
  const [micError, setMicError] = useState("");
  const [translationError, setTranslationError] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [levels, setLevels] = useState<AudioLevels>(INITIAL_LEVELS);

  const connectionRef = useRef<AudioTranslationConnection | null>(null);
  const startingRef = useRef(false);
  const micDeviceIdRef = useRef("");
  const outputDeviceIdRef = useRef("");
  const sessionStartedAtRef = useRef<number | null>(null);

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
      connectionRef.current?.stop();
      connectionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setOutputDeviceLabel("");
      return;
    }

    let cancelled = false;

    void navigator.mediaDevices.enumerateDevices().then((devices) => {
      if (cancelled) {
        return;
      }

      setOutputDeviceLabel(
        deviceLabel(
          outputDeviceId,
          devices,
          outputDeviceId ? "Selected output" : "Not selected"
        )
      );
    });

    return () => {
      cancelled = true;
    };
  }, [outputDeviceId]);

  useEffect(() => {
    if (!isListening || !connectionRef.current) {
      return;
    }

    void connectionRef.current.setOutputDeviceId(outputDeviceId);
  }, [isListening, outputDeviceId]);

  const resetSessionState = useCallback(() => {
    setLevels(INITIAL_LEVELS);
    setLatencyMs(null);
    sessionStartedAtRef.current = null;
  }, []);

  const stopListening = useCallback(() => {
    connectionRef.current?.stop();
    connectionRef.current = null;
    startingRef.current = false;
    setIsListening(false);
    setIsTranslating(false);
    resetSessionState();
  }, [resetSessionState]);

  const startListening = useCallback(async () => {
    if (connectionRef.current || startingRef.current) {
      return Boolean(connectionRef.current);
    }

    startingRef.current = true;
    setMicError("");
    setTranslationError("");
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
  }, [resetSessionState]);

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
    latencyMs,
    inputLevel: levels.inputLevel,
    inputPeak: levels.inputPeak,
    outputLevel: levels.outputLevel,
    outputPeak: levels.outputPeak,
    startListening,
    stopListening,
    restartListening,
  };
}
