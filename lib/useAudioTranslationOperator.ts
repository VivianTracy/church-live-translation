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
import { listMicrophoneDevices } from "@/lib/microphoneDeviceStorage";
import {
  INITIAL_OPERATOR_SESSION_STATE,
  isOperatorSessionLocked,
  reduceOperatorSession,
  type OperatorSessionState,
} from "@/lib/operatorSessionState";
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
  const [session, setSession] = useState<OperatorSessionState>(
    INITIAL_OPERATOR_SESSION_STATE
  );
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
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [micError, setMicError] = useState("");
  const [levels, setLevels] = useState<AudioLevels>(INITIAL_LEVELS);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const connectionRef = useRef<AudioTranslationConnection | null>(null);
  const startingRef = useRef(false);
  const sessionRef = useRef(session);
  const startListeningRef = useRef<(reason?: "user" | "reconnect") => Promise<boolean>>(
    async () => false
  );
  const sessionGenerationRef = useRef(0);
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
  const settingsLocked = isOperatorSessionLocked(session.status);
  const outputDeviceLabel = deviceLabel(
    outputDeviceId,
    outputDevices,
    outputDeviceId ? "Selected output" : "Not selected"
  );

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const applySession = useCallback((next: OperatorSessionState) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

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
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }

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
    });

    return () => {
      cancelled = true;
    };
  }, [syncInputDeviceForSource]);

  useEffect(() => {
    return () => {
      sessionGenerationRef.current += 1;
      connectionRef.current?.stop();
      connectionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    let cancelled = false;

    void navigator.mediaDevices.enumerateDevices().then((devices) => {
      if (cancelled) {
        return;
      }

      setOutputDevices(devices);
    });

    return () => {
      cancelled = true;
    };
  }, [outputDeviceId]);

  useEffect(() => {
    if (session.status !== "live" || !connectionRef.current) {
      return;
    }

    void connectionRef.current.setOutputDeviceId(outputDeviceId);
  }, [outputDeviceId, session.status]);

  const resetLanguageDetection = useCallback(() => {
    transcriptBufferRef.current = "";
    languageLockedRef.current = translationDirectionRef.current !== "auto";
    resolvedDirectionRef.current = null;
    setResolvedDirection(null);
  }, []);

  const resetSessionMeters = useCallback(() => {
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

  const tearDownConnection = useCallback(() => {
    connectionRef.current?.stop();
    connectionRef.current = null;
    startingRef.current = false;
    setIsTranslating(false);
    resetSessionMeters();
  }, [resetSessionMeters]);

  const startListening = useCallback(
    async (reason: "user" | "reconnect" = "user"): Promise<boolean> => {
      if (connectionRef.current || startingRef.current) {
        return Boolean(connectionRef.current);
      }

      startingRef.current = true;

      if (reason === "user") {
        applySession(reduceOperatorSession(sessionRef.current, { type: "start" }));
      }
      setMicError("");
      resetSessionMeters();

      const generation = sessionGenerationRef.current;

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

        if (translationDirectionRef.current === "auto") {
          languageLockedRef.current = false;
          resolvedDirectionRef.current = startingDirection;
          setResolvedDirection(startingDirection);
        } else {
          languageLockedRef.current = true;
          resolvedDirectionRef.current = null;
          setResolvedDirection(null);
        }

        const connection = await connectOpenAIAudioTranslation({
          deviceId: resolvedInput.deviceId,
          outputDeviceId: outputDeviceIdRef.current || undefined,
          outputLanguage: startingOutputLanguage,
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
            setMicError("");
            applySession({
              ...sessionRef.current,
              error: message,
            });
          },
          onConnectionLost: (lostReason) => {
            if (sessionGenerationRef.current !== generation) {
              return;
            }

            const next = reduceOperatorSession(sessionRef.current, {
              type: "connection-lost",
              reason: lostReason,
            });
            applySession(next);
            tearDownConnection();

            if (next.status === "reconnecting") {
              void startListeningRef.current("reconnect");
            }
          },
        });

        if (sessionGenerationRef.current !== generation) {
          connection.stop();
          startingRef.current = false;
          return false;
        }

        connectionRef.current = connection;
        startingRef.current = false;
        applySession(
          reduceOperatorSession(sessionRef.current, { type: "connected" })
        );
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (sessionGenerationRef.current !== generation) {
          startingRef.current = false;
          return false;
        }

        startingRef.current = false;
        connectionRef.current = null;
        setIsTranslating(false);
        resetSessionMeters();

        const next = reduceOperatorSession(sessionRef.current, {
          type: "start-failed",
          error: message,
        });
        applySession(next);

        if (reason === "user") {
          setMicError(message);
        }

        if (next.status === "reconnecting") {
          return startListeningRef.current("reconnect");
        }

        return false;
      }
    },
    [
      applySession,
      handleInputTranscript,
      resetSessionMeters,
      syncInputDeviceForSource,
      tearDownConnection,
    ]
  );

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const stopListening = useCallback(() => {
    sessionGenerationRef.current += 1;
    tearDownConnection();
    setMicError("");
    applySession(reduceOperatorSession(sessionRef.current, { type: "stop" }));
  }, [applySession, tearDownConnection]);

  const restartListening = useCallback(async () => {
    stopListening();
    return startListening("user");
  }, [startListening, stopListening]);

  const setMicDeviceId = useCallback((deviceId: string) => {
    const source = audioInputSourceRef.current;
    micDeviceIdRef.current = deviceId;
    setMicDeviceIdState(deviceId);
    saveStoredInputDeviceId(source, deviceId);

    void listMicrophoneDevices().then((devices) => {
      const match = devices.find((device) => device.deviceId === deviceId);
      setInputDeviceLabel(
        match?.label || (deviceId ? "Selected input" : "Not selected")
      );
    });
  }, []);

  const setOutputDeviceId = useCallback((deviceId: string) => {
    outputDeviceIdRef.current = deviceId;
    setOutputDeviceIdState(deviceId);
    saveStoredAudioOutputDeviceId(deviceId);
  }, []);

  const setTranslationDirection = useCallback(
    (direction: AudioTranslationDirection) => {
      translationDirectionRef.current = direction;
      setTranslationDirectionState(direction);
      saveStoredAudioTranslationDirection(direction);
      resetLanguageDetection();
    },
    [resetLanguageDetection]
  );

  const setAudioInputSource = useCallback(
    async (source: AudioInputSource) => {
      if (settingsLocked) {
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
    [settingsLocked, syncInputDeviceForSource]
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
    sessionStatus: session.status,
    autoReconnectsUsed: session.autoReconnectsUsed,
    settingsLocked,
    isTranslating,
    micDeviceId,
    setMicDeviceId,
    outputDeviceId,
    setOutputDeviceId,
    outputDeviceLabel,
    micError,
    translationError: session.error,
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
