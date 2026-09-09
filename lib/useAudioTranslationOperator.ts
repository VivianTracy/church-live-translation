"use client";

import {
  connectOpenAIAudioTranslation,
  type AudioTranslationConnection,
} from "@/lib/openaiAudioTranslationClient";
import {
  directionFromDetectedLanguage,
  getAudioTranslationDirectionConfig,
  loadStoredAudioTranslationDirection,
  loadStoredAutoResolvedDirection,
  saveStoredAudioTranslationDirection,
  saveStoredAutoResolvedDirection,
  type AudioTranslationDirection,
  type ResolvedAudioTranslationDirection,
} from "@/lib/audioTranslationDirection";
import { detectSpeechLanguage } from "@/lib/detectSpeechLanguage";
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
    useState<AudioTranslationDirection>("auto");
  const [resolvedDirection, setResolvedDirection] =
    useState<ResolvedAudioTranslationDirection | null>(null);
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
  const translationDirectionRef = useRef<AudioTranslationDirection>("auto");
  const resolvedDirectionRef = useRef<ResolvedAudioTranslationDirection | null>(
    null
  );
  const sessionOutputLanguageRef = useRef<"en" | "zh">("en");
  const transcriptBufferRef = useRef("");
  const languageLockedRef = useRef(false);
  const audioInputSourceRef = useRef<AudioInputSource>("obs-streaming");
  const sessionStartedAtRef = useRef<number | null>(null);

  const directionConfig = getAudioTranslationDirectionConfig(
    translationDirection,
    translationDirection === "auto" ? resolvedDirection : null
  );

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

  const resetLanguageDetection = useCallback(() => {
    transcriptBufferRef.current = "";
    languageLockedRef.current = translationDirectionRef.current !== "auto";
    resolvedDirectionRef.current = null;
    setResolvedDirection(null);
  }, []);

  const resetSessionState = useCallback(() => {
    setLevels(INITIAL_LEVELS);
    setLatencyMs(null);
    sessionStartedAtRef.current = null;
  }, []);

  const applyDetectedDirection = useCallback(
    (direction: ResolvedAudioTranslationDirection) => {
      languageLockedRef.current = true;
      resolvedDirectionRef.current = direction;
      setResolvedDirection(direction);
      saveStoredAutoResolvedDirection(direction);

      const outputLanguage = getAudioTranslationDirectionConfig(direction)
        .outputLanguage;

      if (outputLanguage !== sessionOutputLanguageRef.current) {
        sessionOutputLanguageRef.current = outputLanguage;
        connectionRef.current?.updateOutputLanguage(outputLanguage);
      }
    },
    []
  );

  const handleInputTranscript = useCallback(
    (delta: string) => {
      if (translationDirectionRef.current !== "auto" || languageLockedRef.current) {
        return;
      }

      transcriptBufferRef.current += delta;
      const detected = detectSpeechLanguage(transcriptBufferRef.current);

      if (!detected) {
        return;
      }

      applyDetectedDirection(directionFromDetectedLanguage(detected));
    },
    [applyDetectedDirection]
  );

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

      const startingDirection =
        translationDirectionRef.current === "auto"
          ? loadStoredAutoResolvedDirection()
          : translationDirectionRef.current;
      const startingOutputLanguage =
        getAudioTranslationDirectionConfig(startingDirection).outputLanguage;

      sessionOutputLanguageRef.current = startingOutputLanguage;
      transcriptBufferRef.current = "";
      // Auto starts translating immediately with the last known direction.
      // Transcripts may later switch it; they must not block audio.
      if (translationDirectionRef.current === "auto") {
        languageLockedRef.current = false;
        resolvedDirectionRef.current = startingDirection;
        setResolvedDirection(startingDirection);
      } else {
        languageLockedRef.current = true;
        resolvedDirectionRef.current = null;
        setResolvedDirection(null);
      }

      connectionRef.current = await connectOpenAIAudioTranslation({
        deviceId: resolvedInput.deviceId,
        outputDeviceId: outputDeviceIdRef.current || undefined,
        outputLanguage: startingOutputLanguage,
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
        onInputTranscript: handleInputTranscript,
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
  }, [handleInputTranscript, resetSessionState, syncInputDeviceForSource]);

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
    resetLanguageDetection();
  }, [resetLanguageDetection]);

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
    resolvedDirection,
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
