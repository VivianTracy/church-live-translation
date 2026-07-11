"use client";

import {
  connectOpenAIAudioTranslation,
  type AudioTranslationConnection,
} from "@/lib/openaiAudioTranslationClient";
import {
  getAudioTranslationDirectionConfig,
  loadStoredAudioTranslationDirection,
  saveStoredAudioTranslationDirection,
  type AudioTranslationDirection,
} from "@/lib/audioTranslationDirection";
import {
  getAudioInputSourceLabel,
  loadStoredAudioInputSource,
  loadStoredInputDeviceId,
  resolveInputDeviceForSource,
  saveStoredAudioInputSource,
  saveStoredInputDeviceId,
  type AudioInputSource,
} from "@/lib/audioInputSource";
import {
  loadStoredAudioOutputDeviceId,
  saveStoredAudioOutputDeviceId,
} from "@/lib/audioOutputDeviceStorage";
import {
  listMicrophoneDevices,
  requestMicrophonePermission,
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
  const [translationDirection, setTranslationDirectionState] =
    useState<AudioTranslationDirection>("zh-to-en");
  const [audioInputSource, setAudioInputSourceState] =
    useState<AudioInputSource>("obs-streaming");
  const [inputDeviceLabel, setInputDeviceLabel] = useState("");
  const [outputDeviceLabel, setOutputDeviceLabel] = useState("");
  const [micError, setMicError] = useState("");
  const [translationError, setTranslationError] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [levels, setLevels] = useState<AudioLevels>(INITIAL_LEVELS);

  const connectionRef = useRef<AudioTranslationConnection | null>(null);
  const startingRef = useRef(false);
  const micDeviceIdRef = useRef("");
  const outputDeviceIdRef = useRef("");
  const translationDirectionRef = useRef<AudioTranslationDirection>("zh-to-en");
  const audioInputSourceRef = useRef<AudioInputSource>("obs-streaming");
  const sessionStartedAtRef = useRef<number | null>(null);

  const directionConfig = getAudioTranslationDirectionConfig(translationDirection);

  const applyResolvedInputDevice = useCallback(
    (source: AudioInputSource, deviceId: string, label: string) => {
      micDeviceIdRef.current = deviceId;
      setMicDeviceIdState(deviceId);
      setInputDeviceLabel(label);
      saveStoredInputDeviceId(source, deviceId);
    },
    []
  );

  const syncInputDeviceForSource = useCallback(
    async (source: AudioInputSource, preferredDeviceId = "") => {
      const devices = await listMicrophoneDevices();
      const resolved = resolveInputDeviceForSource(
        devices,
        source,
        preferredDeviceId || micDeviceIdRef.current
      );

      if (resolved.error) {
        applyResolvedInputDevice(source, "", "Not selected");
        return resolved;
      }

      applyResolvedInputDevice(source, resolved.deviceId, resolved.label);
      return resolved;
    },
    [applyResolvedInputDevice]
  );

  useEffect(() => {
    const storedOutputId = loadStoredAudioOutputDeviceId();
    const storedDirection = loadStoredAudioTranslationDirection();
    const storedInputSource = loadStoredAudioInputSource();

    outputDeviceIdRef.current = storedOutputId;
    translationDirectionRef.current = storedDirection;
    audioInputSourceRef.current = storedInputSource;
    setOutputDeviceIdState(storedOutputId);
    setTranslationDirectionState(storedDirection);
    setAudioInputSourceState(storedInputSource);

    void syncInputDeviceForSource(
      storedInputSource,
      loadStoredInputDeviceId(storedInputSource)
    );
  }, [syncInputDeviceForSource]);

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

      const resolvedInput = await syncInputDeviceForSource(
        audioInputSourceRef.current,
        micDeviceIdRef.current
      );

      if (resolvedInput.error || !resolvedInput.deviceId) {
        throw new Error(
          resolvedInput.error ??
            "No input device is configured for the selected audio source."
        );
      }

      connectionRef.current = await connectOpenAIAudioTranslation({
        deviceId: resolvedInput.deviceId,
        outputDeviceId: outputDeviceIdRef.current || undefined,
        outputLanguage: getAudioTranslationDirectionConfig(
          translationDirectionRef.current
        ).outputLanguage,
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
  }, [resetSessionState, syncInputDeviceForSource]);

  const restartListening = useCallback(async () => {
    stopListening();
    return startListening();
  }, [startListening, stopListening]);

  const setMicDeviceId = useCallback(
    (deviceId: string) => {
      const source = audioInputSourceRef.current;
      micDeviceIdRef.current = deviceId;
      setMicDeviceIdState(deviceId);
      saveStoredInputDeviceId(source, deviceId);

      void listMicrophoneDevices().then((devices) => {
        const match = devices.find((device) => device.deviceId === deviceId);
        setInputDeviceLabel(match?.label || (deviceId ? "Selected input" : "Not selected"));
      });
    },
    []
  );

  const setOutputDeviceId = useCallback((deviceId: string) => {
    outputDeviceIdRef.current = deviceId;
    setOutputDeviceIdState(deviceId);
    saveStoredAudioOutputDeviceId(deviceId);
  }, []);

  const setTranslationDirection = useCallback((direction: AudioTranslationDirection) => {
    translationDirectionRef.current = direction;
    setTranslationDirectionState(direction);
    saveStoredAudioTranslationDirection(direction);
  }, []);

  const setAudioInputSource = useCallback(
    async (source: AudioInputSource) => {
      if (isListening) {
        return;
      }

      audioInputSourceRef.current = source;
      setAudioInputSourceState(source);
      saveStoredAudioInputSource(source);

      const resolved = await syncInputDeviceForSource(
        source,
        loadStoredInputDeviceId(source)
      );

      if (resolved.error) {
        setMicError(resolved.error);
      } else {
        setMicError("");
      }
    },
    [isListening, syncInputDeviceForSource]
  );

  return {
    translationStatusLabel: directionConfig.statusLabel,
    translationDirection,
    setTranslationDirection,
    audioInputSource,
    setAudioInputSource,
    audioInputSourceLabel: getAudioInputSourceLabel(audioInputSource),
    inputDeviceLabel,
    inputLanguageLabel: directionConfig.inputLanguageLabel,
    outputLanguageLabel: directionConfig.outputLanguageLabel,
    channelSummary: directionConfig.channelSummary,
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
