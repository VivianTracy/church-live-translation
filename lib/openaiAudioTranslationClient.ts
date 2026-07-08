import { startAudioLevelMonitor } from "@/lib/audioLevelMonitor";
import { getCaptionMicrophoneStream } from "@/lib/microphoneStream";
import { OPENAI_TRANSLATION_CALLS_URL } from "@/lib/openaiModels";

type RealtimeTranslationEvent = {
  type?: string;
  delta?: string;
  message?: string;
  error?: {
    message?: string;
  };
};

export type AudioTranslationConnection = {
  stop: () => void;
  setOutputDeviceId: (deviceId: string) => Promise<void>;
};

type ConnectOptions = {
  deviceId?: string;
  outputDeviceId?: string;
  onListeningChange: (isListening: boolean) => void;
  onTranslatingChange: (isTranslating: boolean) => void;
  onInputLevels: (level: number, peak: number) => void;
  onOutputLevels: (level: number, peak: number) => void;
  onFirstOutputAudio?: () => void;
  onInputTranscriptDelta?: (delta: string) => void;
  onOutputTranscriptDelta?: (delta: string) => void;
  onTranslatedStream?: (stream: MediaStream) => void;
  onError: (message: string) => void;
};

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

export async function connectOpenAIAudioTranslation(
  options: ConnectOptions
): Promise<AudioTranslationConnection> {
  const sessionResponse = await fetch("/api/openai/audio-translation-session", {
    method: "POST",
  });

  const sessionData = (await sessionResponse.json()) as {
    clientSecret?: string;
    model?: string;
    error?: string;
  };

  if (!sessionResponse.ok || !sessionData.clientSecret) {
    throw new Error(
      sessionData.error ?? "Could not create OpenAI audio translation session."
    );
  }

  const mic = await getCaptionMicrophoneStream(options.deviceId);

  const inputContext = new AudioContext();

  if (inputContext.state === "suspended") {
    await inputContext.resume();
  }

  const inputSource = inputContext.createMediaStreamSource(mic.stream);
  const inputAnalyser = inputContext.createAnalyser();
  inputAnalyser.fftSize = 2048;
  inputSource.connect(inputAnalyser);

  const stopInputMonitor = startAudioLevelMonitor(
    inputAnalyser,
    options.onInputLevels
  );

  const peerConnection = new RTCPeerConnection();
  const events = peerConnection.createDataChannel("oai-events");

  const translatedAudio = document.createElement("audio");
  translatedAudio.autoplay = true;

  let outputMonitorContext: AudioContext | null = null;
  let stopOutputMonitor: (() => void) | null = null;
  let outputDeviceId = options.outputDeviceId ?? "";
  let hasReceivedOutput = false;
  let stopped = false;
  let attachGeneration = 0;

  const teardownOutputMonitor = () => {
    stopOutputMonitor?.();
    stopOutputMonitor = null;
    void outputMonitorContext?.close();
    outputMonitorContext = null;
  };

  const attachTranslatedStream = async (outputStream: MediaStream) => {
    if (stopped) {
      return;
    }

    const generation = ++attachGeneration;
    translatedAudio.srcObject = outputStream;

    try {
      await applyAudioOutputDevice(translatedAudio, outputDeviceId);
      await translatedAudio.play();
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

    teardownOutputMonitor();

    outputMonitorContext = new AudioContext();

    if (outputMonitorContext.state === "suspended") {
      await outputMonitorContext.resume();
    }

    const outputSource =
      outputMonitorContext.createMediaStreamSource(outputStream);
    const outputAnalyser = outputMonitorContext.createAnalyser();
    outputAnalyser.fftSize = 2048;
    outputSource.connect(outputAnalyser);

    if (generation !== attachGeneration || stopped) {
      void outputMonitorContext.close();
      return;
    }

    stopOutputMonitor = startAudioLevelMonitor(
      outputAnalyser,
      options.onOutputLevels
    );

    if (!hasReceivedOutput) {
      hasReceivedOutput = true;
      options.onTranslatingChange(true);
      options.onFirstOutputAudio?.();
    }

    options.onTranslatedStream?.(outputStream);
  };

  for (const track of mic.stream.getAudioTracks()) {
    peerConnection.addTrack(track, mic.stream);
  }

  peerConnection.ontrack = (event) => {
    if (stopped || event.track.kind !== "audio") {
      return;
    }

    const outputStream =
      event.streams[0] ?? new MediaStream([event.track]);

    void attachTranslatedStream(outputStream);
  };

  events.onmessage = ({ data }) => {
    const event = JSON.parse(data as string) as RealtimeTranslationEvent;

    if (event.type === "session.output_transcript.delta") {
      if (!hasReceivedOutput) {
        hasReceivedOutput = true;
        options.onTranslatingChange(true);
        options.onFirstOutputAudio?.();
      }

      options.onOutputTranscriptDelta?.(event.delta ?? "");
      return;
    }

    if (event.type === "session.input_transcript.delta") {
      options.onInputTranscriptDelta?.(event.delta ?? "");
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

    if (
      peerConnection.connectionState === "failed" ||
      peerConnection.connectionState === "disconnected"
    ) {
      options.onError(
        `Translation connection ${peerConnection.connectionState}.`
      );
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

  options.onListeningChange(true);

  const cleanup = () => {
    if (stopped) {
      return;
    }

    stopped = true;
    attachGeneration += 1;
    stopInputMonitor();
    teardownOutputMonitor();
    translatedAudio.pause();
    translatedAudio.srcObject = null;
    peerConnection.close();
    mic.stream.getTracks().forEach((track) => track.stop());
    void inputContext.close();
    options.onListeningChange(false);
    options.onTranslatingChange(false);
  };

  return {
    async setOutputDeviceId(deviceId: string) {
      outputDeviceId = deviceId;

      try {
        await applyAudioOutputDevice(translatedAudio, deviceId);
      } catch (error) {
        options.onError(
          error instanceof Error
            ? error.message
            : "Failed to route translated audio to the selected output."
        );
      }
    },

    stop: cleanup,
  };
}
