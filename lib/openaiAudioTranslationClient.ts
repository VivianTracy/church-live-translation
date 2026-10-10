import { startAudioLevelMonitor } from "@/lib/audioLevelMonitor";
import { clampAudioOutputVolume } from "@/lib/audioOutputVolumeStorage";
import { pcm16ToBase64, startCompactedMicSender } from "@/lib/compactedMicSender";
import { getTranslationMicrophoneStream } from "@/lib/microphoneStream";
import { encodePcm16ToWavBase64, startAudioNodePcmUploader } from "@/lib/pcmAudioCapture";
import {
  OPENAI_AUDIO_TRANSLATION_MODEL,
  OPENAI_TRANSLATION_CALLS_URL,
} from "@/lib/openaiModels";
import {
  readTranslationAudioDelta,
  startTranslatedPcmPlayback,
} from "@/lib/translatedPcmPlayback";
import {
  createTranslationSessionResources,
  stopTranslationSessionResources,
} from "@/lib/translationSessionResources";

/** Brief Wi-Fi blips can report disconnected before ICE recovers. */
const DISCONNECT_GRACE_MS = 1500;
const TRANSLATION_SOCKET_TIMEOUT_MS = 4000;
const TRANSLATION_SESSION_READY_MS = 800;

function openTranslationSocket(clientSecret: string): Promise<WebSocket> {
  const socket = new WebSocket(
    `wss://api.openai.com/v1/realtime/translations?model=${OPENAI_AUDIO_TRANSLATION_MODEL}`,
    ["realtime", `openai-insecure-api-key.${clientSecret}`]
  );

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      finish(false, "Translation socket timed out.");
    }, TRANSLATION_SOCKET_TIMEOUT_MS);

    const finish = (opened: boolean, message: string) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      socket.onopen = null;
      socket.onerror = null;

      if (opened) {
        resolve(socket);
        return;
      }

      socket.close();
      reject(new Error(message));
    };

    socket.onopen = () => {
      finish(true, "");
    };

    socket.onerror = () => {
      finish(false, "Translation socket failed to open.");
    };
  });
}

function waitForTranslationSession(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timer) {
        clearTimeout(timer);
      }

      socket.onmessage = null;

      if (error) {
        reject(error);
        return;
      }

      resolve();
    };
    timer = setTimeout(() => {
      finish();
    }, TRANSLATION_SESSION_READY_MS);

    socket.onmessage = ({ data }) => {
      let event: RealtimeTranslationEvent;

      try {
        event = JSON.parse(String(data)) as RealtimeTranslationEvent;
      } catch {
        return;
      }

      if (event.type === "session.created" || event.type === "session.updated") {
        finish();
        return;
      }

      if (event.type === "error" || event.type?.includes("error")) {
        finish(new Error(formatTranslationError(event)));
      }
    };
  });
}

type RealtimeTranslationEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
  text?: string;
  message?: string;
  error?: {
    message?: string;
  };
};

function readTranscriptText(event: RealtimeTranslationEvent): string {
  if (typeof event.delta === "string" && event.delta) {
    return event.delta;
  }

  if (typeof event.transcript === "string" && event.transcript) {
    return event.transcript;
  }

  if (typeof event.text === "string" && event.text) {
    return event.text;
  }

  return "";
}

function isInputTranscriptEvent(type: string | undefined): boolean {
  if (!type) {
    return false;
  }

  return (
    type === "session.input_transcript.delta" ||
    type === "session.input_transcript.done" ||
    type.includes("input_transcript") ||
    type.includes("input_audio_transcription")
  );
}

export type AudioTranslationConnection = {
  stop: () => void;
  setOutputDeviceId: (deviceId: string) => Promise<void>;
  setOutputVolume: (volume: number) => void;
  updateOutputLanguage: (language: "en" | "zh") => void;
};

type ConnectOptions = {
  deviceId?: string;
  outputDeviceId?: string;
  outputVolume?: number;
  outputLanguage?: "en" | "zh";
  onTranslatingChange: (isTranslating: boolean) => void;
  onInputLevels: (level: number, peak: number) => void;
  onOutputLevels: (level: number, peak: number) => void;
  onInputTranscript?: (delta: string) => void;
  onFirstOutputAudio?: () => void;
  onWavChunk?: (wavBase64: string) => void;
  onSessionEvent?: (sessionEventId: string | null) => void;
  onError: (message: string) => void;
  onConnectionLost: (reason: string) => void;
};

function buildOutputLanguageUpdate(language: "en" | "zh"): string {
  return JSON.stringify({
    type: "session.update",
    session: {
      audio: {
        output: {
          language,
        },
      },
    },
  });
}

function formatTranslationError(event: RealtimeTranslationEvent): string {
  if (event.error?.message) {
    return event.error.message;
  }

  if (event.message) {
    return event.message;
  }

  if (event.type?.includes("error")) {
    return event.type;
  }

  return "OpenAI audio translation error";
}

async function applyAudioOutputDevice(
  audio: HTMLAudioElement,
  deviceId: string
): Promise<void> {
  if (!deviceId || !("setSinkId" in audio)) {
    return;
  }

  await audio.setSinkId(deviceId);
}

function createPlaybackElement(volume: number): HTMLAudioElement {
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.volume = volume;
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  audio.style.display = "none";
  document.body.appendChild(audio);
  return audio;
}

async function playRoutedAudio(
  audio: HTMLAudioElement,
  stream: MediaStream,
  deviceId: string
): Promise<void> {
  audio.srcObject = stream;
  await applyAudioOutputDevice(audio, deviceId);
  await audio.play();
}

function getPlayedAudioStream(
  audio: HTMLAudioElement,
  fallback: MediaStream
): MediaStream {
  const capture = (
    audio as HTMLAudioElement & { captureStream?: () => MediaStream }
  ).captureStream;

  if (typeof capture !== "function") {
    return fallback;
  }

  try {
    const played = capture.call(audio);
    return played.getAudioTracks().length > 0 ? played : fallback;
  } catch {
    return fallback;
  }
}

export async function connectOpenAIAudioTranslation(
  options: ConnectOptions
): Promise<AudioTranslationConnection> {
  const resources = createTranslationSessionResources();
  let stopped = false;
  let connectionLostNotified = false;
  let outputDeviceId = options.outputDeviceId ?? "";
  let outputVolume = clampAudioOutputVolume(options.outputVolume ?? 1);
  let outputLanguage = options.outputLanguage ?? "en";
  let pendingOutputLanguage: "en" | "zh" | null = null;
  let hasReceivedOutput = false;
  let attachGeneration = 0;
  let activeOutputTrackId: string | null = null;
  let events: RTCDataChannel | null = null;

  const cleanup = () => {
    if (stopped) {
      return;
    }

    stopped = true;
    attachGeneration += 1;
    activeOutputTrackId = null;
    stopTranslationSessionResources(resources);
    options.onTranslatingChange(false);
  };

  const notifyConnectionLost = (state: string) => {
    if (stopped || connectionLostNotified) {
      return;
    }

    connectionLostNotified = true;
    options.onConnectionLost(`Translation connection ${state}.`);
  };

  try {
    const sessionResponse = await fetch("/api/openai/audio-translation-session", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        outputLanguage: options.outputLanguage ?? "en",
      }),
    });

    const sessionData = (await sessionResponse.json()) as {
      clientSecret?: string;
      model?: string;
      sessionEventId?: string | null;
      error?: string;
    };

    if (!sessionResponse.ok || !sessionData.clientSecret) {
      throw new Error(
        sessionData.error ?? "Could not create OpenAI audio translation session."
      );
    }

    options.onSessionEvent?.(sessionData.sessionEventId ?? null);

    const mic = await getTranslationMicrophoneStream(options.deviceId);
    resources.micStream = mic.stream;

    const inputContext = new AudioContext();
    resources.inputContext = inputContext;

    if (inputContext.state === "suspended") {
      await inputContext.resume();
    }

    const inputSource = inputContext.createMediaStreamSource(mic.stream);
    const inputAnalyser = inputContext.createAnalyser();
    inputAnalyser.fftSize = 2048;
    inputSource.connect(inputAnalyser);

    resources.stopInputMonitor = startAudioLevelMonitor(
      inputAnalyser,
      options.onInputLevels
    );

    const transmitterAudio = createPlaybackElement(outputVolume);
    resources.transmitterAudio = transmitterAudio;

    let translationSocket: WebSocket | null = null;

    try {
      translationSocket = await openTranslationSocket(sessionData.clientSecret);
    } catch (error) {
      console.error(
        "Pause shortening unavailable. Sending the microphone directly.",
        error
      );
    }

    if (translationSocket) {
      const socket = translationSocket;

      try {
        await waitForTranslationSession(socket);

        const playback = startTranslatedPcmPlayback();
        resources.monitorContext = playback.context;

        if (playback.context.state === "suspended") {
          await playback.context.resume();
        }

        await playRoutedAudio(transmitterAudio, playback.stream, outputDeviceId);

        const stopLevels = startAudioLevelMonitor(
          playback.analyser,
          options.onOutputLevels
        );
        resources.stopOutputMonitor = () => {
          stopLevels();
          playback.stop();
        };

        const wavChunks: Int16Array[] = [];

        if (options.onWavChunk) {
          const onWavChunk = options.onWavChunk;
          const flushWav = () => {
            if (wavChunks.length === 0) {
              return;
            }

            const total = wavChunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const merged = new Int16Array(total);
            let offset = 0;

            for (const chunk of wavChunks) {
              merged.set(chunk, offset);
              offset += chunk.length;
            }

            wavChunks.length = 0;
            onWavChunk(encodePcm16ToWavBase64(merged));
          };
          const wavTimer = setInterval(flushWav, 800);
          resources.stopPcmUpload = () => {
            clearInterval(wavTimer);
            flushWav();
          };
        }

        const sendSocket = (payload: string) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(payload);
          }
        };

        resources.closeTranslationSocket = () => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "session.close" }));
          }

          socket.onmessage = null;
          socket.onclose = null;
          socket.close();
        };

        resources.stopCompactedInput = startCompactedMicSender(
          inputContext,
          inputSource,
          (pcm16) => {
            if (stopped) {
              return;
            }

            sendSocket(
              JSON.stringify({
                type: "session.input_audio_buffer.append",
                audio: pcm16ToBase64(pcm16),
              })
            );
          }
        );

        sendSocket(buildOutputLanguageUpdate(outputLanguage));

        socket.onmessage = ({ data }) => {
          if (stopped) {
            return;
          }

          let event: RealtimeTranslationEvent;

          try {
            event = JSON.parse(String(data)) as RealtimeTranslationEvent;
          } catch {
            return;
          }

          if (event.type === "session.output_audio.delta") {
            const pcm16 = readTranslationAudioDelta(event);

            if (!pcm16) {
              return;
            }

            playback.pushPcm16(pcm16);

            if (options.onWavChunk) {
              wavChunks.push(pcm16);
            }

            if (!hasReceivedOutput) {
              hasReceivedOutput = true;
              options.onTranslatingChange(true);
              options.onFirstOutputAudio?.();
            }

            return;
          }

          if (event.type === "session.output_transcript.delta") {
            if (!hasReceivedOutput) {
              hasReceivedOutput = true;
              options.onTranslatingChange(true);
              options.onFirstOutputAudio?.();
            }

            return;
          }

          if (isInputTranscriptEvent(event.type)) {
            const text = readTranscriptText(event);

            if (text) {
              options.onInputTranscript?.(text);
            }

            return;
          }

          if (event.type === "error" || event.type?.includes("error")) {
            options.onError(formatTranslationError(event));
          }
        };

        socket.onclose = () => {
          if (!stopped) {
            notifyConnectionLost("closed");
          }
        };

        return {
          updateOutputLanguage(language: "en" | "zh") {
            if (stopped || language === outputLanguage) {
              return;
            }

            outputLanguage = language;
            sendSocket(buildOutputLanguageUpdate(language));
          },

          async setOutputDeviceId(deviceId: string) {
            outputDeviceId = deviceId;

            try {
              await applyAudioOutputDevice(transmitterAudio, deviceId);

              if (transmitterAudio.srcObject) {
                await transmitterAudio.play();
              }
            } catch (error) {
              options.onError(
                error instanceof Error
                  ? error.message
                  : "Failed to route translated audio to the transmitter output."
              );
            }
          },

          setOutputVolume(volume: number) {
            outputVolume = clampAudioOutputVolume(volume);

            if (!stopped) {
              transmitterAudio.volume = outputVolume;
            }
          },

          stop: cleanup,
        };
      } catch (error) {
        console.error(
          "Pause shortening unavailable. Sending the microphone directly.",
          error
        );
        socket.onmessage = null;
        socket.onclose = null;

        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "session.close" }));
        }

        socket.close();
        resources.stopCompactedInput?.();
        resources.stopCompactedInput = null;
        resources.closeTranslationSocket = null;
        resources.stopOutputMonitor?.();
        resources.stopOutputMonitor = null;
        resources.stopPcmUpload?.();
        resources.stopPcmUpload = null;
        void resources.monitorContext?.close();
        resources.monitorContext = null;
      }
    }

    const peerConnection = new RTCPeerConnection();
    resources.peerConnection = peerConnection;
    events = peerConnection.createDataChannel("oai-events");

    const sendOutputLanguageUpdate = (language: "en" | "zh") => {
      if (stopped) {
        return;
      }

      if (events?.readyState === "open") {
        events.send(buildOutputLanguageUpdate(language));
        return;
      }

      pendingOutputLanguage = language;
    };

    const teardownOutputMonitor = () => {
      resources.stopPcmUpload?.();
      resources.stopPcmUpload = null;
      resources.stopOutputMonitor?.();
      resources.stopOutputMonitor = null;
      void resources.monitorContext?.close();
      resources.monitorContext = null;
    };

    const attachTranslatedStream = async (outputStream: MediaStream) => {
      if (stopped) {
        return;
      }

      const generation = ++attachGeneration;
      let captureStream = outputStream;

      try {
        transmitterAudio.volume = outputVolume;
        await playRoutedAudio(transmitterAudio, outputStream, outputDeviceId);
        captureStream = getPlayedAudioStream(transmitterAudio, outputStream);
      } catch (error) {
        if (generation === attachGeneration && !stopped) {
          options.onError(
            error instanceof Error
              ? error.message
              : "Failed to play translated audio."
          );
        }
        return;
      }

      if (generation !== attachGeneration || stopped) {
        return;
      }

      teardownOutputMonitor();

      try {
        const monitorContext = new AudioContext();
        resources.monitorContext = monitorContext;

        if (monitorContext.state === "suspended") {
          await monitorContext.resume();
        }

        const outputSource = monitorContext.createMediaStreamSource(captureStream);
        const outputAnalyser = monitorContext.createAnalyser();
        outputAnalyser.fftSize = 2048;
        outputSource.connect(outputAnalyser);

        if (generation !== attachGeneration || stopped) {
          return;
        }

        resources.stopOutputMonitor = startAudioLevelMonitor(
          outputAnalyser,
          options.onOutputLevels
        );

        if (options.onWavChunk) {
          resources.stopPcmUpload = startAudioNodePcmUploader(
            monitorContext,
            outputSource,
            800,
            options.onWavChunk
          );
        }
      } catch {
        resources.monitorContext = null;
      }

      if (generation !== attachGeneration || stopped) {
        return;
      }

      if (!hasReceivedOutput) {
        hasReceivedOutput = true;
        options.onTranslatingChange(true);
        options.onFirstOutputAudio?.();
      }
    };

    for (const track of mic.stream.getAudioTracks()) {
      peerConnection.addTrack(track, mic.stream);
    }

    peerConnection.ontrack = (event) => {
      if (stopped || event.track.kind !== "audio") {
        return;
      }

      if (activeOutputTrackId === event.track.id) {
        return;
      }

      activeOutputTrackId = event.track.id;

      const outputStream = event.streams[0] ?? new MediaStream([event.track]);

      void attachTranslatedStream(outputStream);
    };

    events.onopen = () => {
      if (stopped || !pendingOutputLanguage) {
        return;
      }

      const language = pendingOutputLanguage;
      pendingOutputLanguage = null;
      sendOutputLanguageUpdate(language);
    };

    events.onmessage = ({ data }) => {
      if (stopped) {
        return;
      }

      let event: RealtimeTranslationEvent;

      try {
        event = JSON.parse(data as string) as RealtimeTranslationEvent;
      } catch {
        return;
      }

      if (event.type === "session.output_transcript.delta") {
        if (!hasReceivedOutput) {
          hasReceivedOutput = true;
          options.onTranslatingChange(true);
          options.onFirstOutputAudio?.();
        }

        return;
      }

      if (isInputTranscriptEvent(event.type)) {
        const text = readTranscriptText(event);

        if (text) {
          options.onInputTranscript?.(text);
        }

        return;
      }

      if (event.type === "error" || event.type?.includes("error")) {
        options.onError(formatTranslationError(event));
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (stopped) {
        return;
      }

      const state = peerConnection.connectionState;

      if (resources.disconnectTimer) {
        clearTimeout(resources.disconnectTimer);
        resources.disconnectTimer = null;
      }

      if (state === "connected" || state === "connecting") {
        return;
      }

      if (state === "failed") {
        notifyConnectionLost(state);
        return;
      }

      if (state === "disconnected") {
        resources.disconnectTimer = setTimeout(() => {
          resources.disconnectTimer = null;

          if (stopped) {
            return;
          }

          const current = peerConnection.connectionState;

          if (current === "disconnected" || current === "failed") {
            notifyConnectionLost(current);
          }
        }, DISCONNECT_GRACE_MS);
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const sdpResponse = await fetch(OPENAI_TRANSLATION_CALLS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.clientSecret}`,
        "Content-Type": "application/sdp",
      },
      body: offer.sdp,
    });

    if (!sdpResponse.ok) {
      throw new Error(
        (await sdpResponse.text()) ||
          "OpenAI audio translation call failed to connect."
      );
    }

    await peerConnection.setRemoteDescription({
      type: "answer",
      sdp: await sdpResponse.text(),
    });

    return {
      updateOutputLanguage(language: "en" | "zh") {
        if (stopped || language === outputLanguage) {
          return;
        }

        outputLanguage = language;
        sendOutputLanguageUpdate(language);
      },

      async setOutputDeviceId(deviceId: string) {
        outputDeviceId = deviceId;

        try {
          await applyAudioOutputDevice(transmitterAudio, deviceId);

          if (transmitterAudio.srcObject) {
            await transmitterAudio.play();
          }
        } catch (error) {
          options.onError(
            error instanceof Error
              ? error.message
              : "Failed to route translated audio to the transmitter output."
          );
        }
      },

      setOutputVolume(volume: number) {
        outputVolume = clampAudioOutputVolume(volume);

        if (!stopped) {
          transmitterAudio.volume = outputVolume;
        }
      },

      stop: cleanup,
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
