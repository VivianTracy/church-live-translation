"use client";

import { connectOpenAIAudioTranslation } from "@/lib/openaiAudioTranslationClient";
import { LOCAL_LISTEN_CHURCH_SLUG } from "@/lib/churchSlug";
import { createTranslationWavUploader } from "@/lib/translationAudioBroadcast";
import {
  clearTranslationListenState,
  saveTranslationListenState,
} from "@/lib/translationListenApi";
import type { HeadsetLanguageCode } from "@/lib/translationLanguages";
import { isPhoneLineId } from "@/lib/translationPhoneLine";
import { useCallback, useEffect, useRef, useState } from "react";

type PhoneLineStatus = "off" | "connecting" | "live" | "failed";

export function usePhoneTranslationLine(options: {
  churchSlug?: string;
  deviceId: string;
  primaryLive: boolean;
  lineId: string;
}) {
  const [status, setStatus] = useState<PhoneLineStatus>("off");
  const [error, setError] = useState("");
  const [chunksUploaded, setChunksUploaded] = useState(0);
  const connectionRef = useRef<ReturnType<
    typeof connectOpenAIAudioTranslation
  > | null>(null);
  const activeRef = useRef(false);
  const generationRef = useRef(0);
  const churchSlug = options.churchSlug || LOCAL_LISTEN_CHURCH_SLUG;
  const churchSlugRef = useRef(churchSlug);
  const deviceIdRef = useRef(options.deviceId);
  const primaryLiveRef = useRef(options.primaryLive);
  const lineIdRef = useRef(options.lineId);

  useEffect(() => {
    churchSlugRef.current = churchSlug;
    deviceIdRef.current = options.deviceId;
    primaryLiveRef.current = options.primaryLive;
    lineIdRef.current = options.lineId;
  }, [churchSlug, options.deviceId, options.lineId, options.primaryLive]);

  const stopPhoneLine = useCallback(() => {
    generationRef.current += 1;
    const connection = connectionRef.current;
    connectionRef.current = null;
    activeRef.current = false;
    void connection?.then((session) => session.stop());
    setStatus("off");
    setChunksUploaded(0);

    const slug = churchSlugRef.current;
    const lineId = lineIdRef.current;

    if (slug && isPhoneLineId(lineId)) {
      void clearTranslationListenState(slug, lineId).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!options.primaryLive && activeRef.current) {
      stopPhoneLine();
    }
  }, [options.primaryLive, stopPhoneLine]);

  useEffect(() => {
    if (status !== "connecting" && status !== "live") {
      return;
    }

    const lineId = lineIdRef.current;

    if (!isPhoneLineId(lineId)) {
      return;
    }

    const markLive = () => {
      void saveTranslationListenState(
        { isLive: true, updatedAt: Date.now() },
        churchSlug,
        lineId
      ).catch((markError) => {
        setError(
          markError instanceof Error
            ? markError.message
            : "Could not update the phone listener."
        );
      });
    };

    markLive();
    const timer = window.setInterval(markLive, 5000);
    return () => window.clearInterval(timer);
  }, [churchSlug, status]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      const connection = connectionRef.current;
      connectionRef.current = null;
      activeRef.current = false;
      void connection?.then((session) => session.stop());

      const slug = churchSlugRef.current;
      const lineId = lineIdRef.current;

      if (slug && isPhoneLineId(lineId)) {
        void clearTranslationListenState(slug, lineId).catch(() => undefined);
      }
    };
  }, []);

  const startPhoneLine = useCallback(
    async (language: HeadsetLanguageCode, inputDeviceId = "") => {
      const lineId = lineIdRef.current;

      if (!primaryLiveRef.current || activeRef.current || !isPhoneLineId(lineId)) {
        return;
      }

      if (inputDeviceId) {
        deviceIdRef.current = inputDeviceId;
      }

      const generation = generationRef.current + 1;
      generationRef.current = generation;
      activeRef.current = true;
      setError("");
      setChunksUploaded(0);
      setStatus("connecting");

      const slug = churchSlugRef.current;
      const uploadChunk = createTranslationWavUploader(
        slug,
        (message) => setError(message),
        () => setChunksUploaded((count) => count + 1),
        lineId
      );

      try {
        await saveTranslationListenState(
          { isLive: true, updatedAt: Date.now() },
          slug,
          lineId
        );

        const connection = connectOpenAIAudioTranslation({
          deviceId: deviceIdRef.current || undefined,
          outputLanguage: language,
          playLocally: false,
          onWavChunk: uploadChunk,
          onTranslatingChange: (isTranslating) => {
            if (generationRef.current !== generation) {
              return;
            }

            if (isTranslating) {
              setStatus("live");
            }
          },
          onInputLevels: () => undefined,
          onOutputLevels: () => undefined,
          onError: (message) => {
            if (generationRef.current !== generation) {
              return;
            }

            setError(message);
            setStatus("failed");
            activeRef.current = false;
            void connection.then((session) => session.stop());
            void clearTranslationListenState(slug, lineId).catch(() => undefined);
          },
          onConnectionLost: () => {
            if (generationRef.current !== generation) {
              return;
            }

            setError("Phone translation disconnected.");
            setStatus("failed");
            activeRef.current = false;
            void connection.then((session) => session.stop());
            void clearTranslationListenState(slug, lineId).catch(() => undefined);
          },
        });

        connectionRef.current = connection;
        const session = await connection;

        if (generationRef.current !== generation) {
          session.stop();
          return;
        }
      } catch (startError) {
        if (generationRef.current !== generation) {
          return;
        }

        activeRef.current = false;
        connectionRef.current = null;
        setStatus("failed");
        setError(
          startError instanceof Error
            ? startError.message
            : "Could not start phone translation."
        );
        void clearTranslationListenState(slug, lineId).catch(() => undefined);
      }
    },
    []
  );

  return {
    status,
    error,
    chunksUploaded,
    startPhoneLine,
    stopPhoneLine,
  };
}
