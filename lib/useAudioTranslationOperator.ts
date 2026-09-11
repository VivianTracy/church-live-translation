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
  oppositeAudioTranslationDirection,
  saveStoredAudioTranslationDirection,
  saveStoredAutoResolvedDirection,
  shouldProbeOppositeAutoDirection,
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
  DEFAULT_AUDIO_OUTPUT_VOLUME,
  clampAudioOutputVolume,
  loadStoredAudioOutputVolume,
  saveStoredAudioOutputVolume,
} from "@/lib/audioOutputVolumeStorage";
import { listMicrophoneDevices } from "@/lib/microphoneDeviceStorage";
import { LOCAL_LISTEN_CHURCH_SLUG } from "@/lib/churchSlug";
import { createTranslationWavUploader } from "@/lib/translationAudioBroadcast";
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

export function useAudioTranslationOperator(options?: { churchSlug?: string }) {
  const [session, setSession] = useState<OperatorSessionState>(
    INITIAL_OPERATOR_SESSION_STATE
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [micDeviceId, setMicDeviceIdState] = useState("");
  const [outputDeviceId, setOutputDeviceIdState] = useState("");
  const [outputVolume, setOutputVolumeState] = useState(
    DEFAULT_AUDIO_OUTPUT_VOLUME
  );
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
  const [audienceBroadcastError, setAudienceBroadcastError] = useState("");
  const [chunksUploaded, setChunksUploaded] = useState(0);
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
  const outputVolumeRef = useRef(DEFAULT_AUDIO_OUTPUT_VOLUME);
  const translationDirectionRef = useRef<AudioTranslationDirection>("auto");
  const resolvedDirectionRef = useRef<ResolvedAudioTranslationDirection | null>(
    null
  );
  const sessionOutputLanguageRef = useRef<"en" | "zh">("en");
  const transcriptBufferRef = useRef("");
  const languageLockedRef = useRef(false);
  const preserveAutoDetectionRef = useRef(false);
  const autoDirectionProbedRef = useRef(false);
  const inputPeakRef = useRef(0);
  const audioInputSourceRef = useRef<AudioInputSource>("obs-streaming");
  const sessionStartedAtRef = useRef<number | null>(null);
  const uploadWavChunkRef = useRef<((wavBase64: string) => void) | null>(null);

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
      const storedOutputVolume = loadStoredAudioOutputVolume();
      const storedDirection = loadStoredAudioTranslationDirection();
      const storedInputSource = loadStoredAudioInputSource();

      outputDeviceIdRef.current = storedOutputId;
      outputVolumeRef.current = storedOutputVolume;
      translationDirectionRef.current = storedDirection;
      audioInputSourceRef.current = storedInputSource;
      setOutputDeviceIdState(storedOutputId);
      setOutputVolumeState(storedOutputVolume);
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

  useEffect(() => {
    if (session.status !== "live" || !connectionRef.current) {
      return;
    }

    connectionRef.current.setOutputVolume(outputVolume);
  }, [outputVolume, session.status]);

  const resetLanguageDetection = useCallback(() => {
    transcriptBufferRef.current = "";
    languageLockedRef.current = translationDirectionRef.current !== "auto";
    resolvedDirectionRef.current = null;
    setResolvedDirection(null);
    autoDirectionProbedRef.current = false;
  }, []);

  const resetSessionMeters = useCallback(() => {
    setLevels(INITIAL_LEVELS);
    setLatencyMs(null);
    setChunksUploaded(0);
    setAudienceBroadcastError("");
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

      if (outputLanguage === sessionOutputLanguageRef.current) {
        return;
      }

      sessionOutputLanguageRef.current = outputLanguage;
      preserveAutoDetectionRef.current = true;
      connectionRef.current?.stop();
      connectionRef.current = null;
      startingRef.current = false;
      applySession(
        reduceOperatorSession(sessionRef.current, { type: "start" })
      );
      void startListeningRef.current("reconnect");
    },
    [applySession]
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
    uploadWavChunkRef.current = null;
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
      uploadWavChunkRef.current = createTranslationWavUploader(
        options?.churchSlug || LOCAL_LISTEN_CHURCH_SLUG,
        setAudienceBroadcastError,
        () => {
          setChunksUploaded((count) => count + 1);
        }
      );

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

        const preserveAutoDetection = preserveAutoDetectionRef.current;
        preserveAutoDetectionRef.current = false;

        const startingDirection =
          translationDirectionRef.current === "auto"
            ? preserveAutoDetection && resolvedDirectionRef.current
              ? resolvedDirectionRef.current
              : loadStoredAutoResolvedDirection()
            : translationDirectionRef.current;
        const startingOutputLanguage =
          getAudioTranslationDirectionConfig(startingDirection).outputLanguage;

        sessionOutputLanguageRef.current = startingOutputLanguage;
        transcriptBufferRef.current = "";
        autoDirectionProbedRef.current = preserveAutoDetection;

        if (translationDirectionRef.current === "auto") {
          if (preserveAutoDetection && resolvedDirectionRef.current) {
            languageLockedRef.current = true;
            setResolvedDirection(resolvedDirectionRef.current);
          } else {
            languageLockedRef.current = false;
            resolvedDirectionRef.current = null;
            setResolvedDirection(null);
          }
        } else {
          languageLockedRef.current = true;
          resolvedDirectionRef.current = null;
          setResolvedDirection(null);
        }

        const connection = await connectOpenAIAudioTranslation({
          deviceId: resolvedInput.deviceId,
          outputDeviceId: outputDeviceIdRef.current || undefined,
          outputVolume: outputVolumeRef.current,
          outputLanguage: startingOutputLanguage,
          onTranslatingChange: setIsTranslating,
          onInputLevels: (inputLevel, inputPeak) => {
            inputPeakRef.current = inputPeak;
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
          onWavChunk: (wavBase64) => {
            uploadWavChunkRef.current?.(wavBase64);
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
      options?.churchSlug,
      resetSessionMeters,
      syncInputDeviceForSource,
      tearDownConnection,
    ]
  );

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  useEffect(() => {
    if (
      session.status !== "live" ||
      translationDirection !== "auto" ||
      isTranslating
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      const startedAt = sessionStartedAtRef.current;

      if (
        startedAt === null ||
        !shouldProbeOppositeAutoDirection({
          elapsedMs: Date.now() - startedAt,
          isTranslating: false,
          inputPeak: inputPeakRef.current,
          alreadyProbed: autoDirectionProbedRef.current,
        })
      ) {
        return;
      }

      const currentDirection =
        sessionOutputLanguageRef.current === "en" ? "zh-to-en" : "en-to-zh";
      autoDirectionProbedRef.current = true;
      applyDetectedDirection(
        oppositeAudioTranslationDirection(currentDirection)
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    applyDetectedDirection,
    isTranslating,
    session.status,
    translationDirection,
  ]);

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

  const setOutputVolume = useCallback((volume: number) => {
    const nextVolume = clampAudioOutputVolume(volume);
    outputVolumeRef.current = nextVolume;
    setOutputVolumeState(nextVolume);
    saveStoredAudioOutputVolume(nextVolume);
    connectionRef.current?.setOutputVolume(nextVolume);
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
    outputVolume,
    setOutputVolume,
    outputDeviceLabel,
    micError,
    translationError: session.error,
    audienceBroadcastError,
    chunksUploaded,
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
