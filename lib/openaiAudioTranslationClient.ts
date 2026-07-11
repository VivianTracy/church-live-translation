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

function stopPlaybackElement(audio: HTMLAudioElement): void {
  audio.pause();
  audio.currentTime = 0;
  audio.srcObject = null;
  audio.removeAttribute("src");
  audio.load();
  audio.remove();
}

function stopPeerConnectionTracks(peerConnection: RTCPeerConnection): void {
  for (const receiver of peerConnection.getReceivers()) {
    receiver.track.stop();
  }

  for (const sender of peerConnection.getSenders()) {
    sender.track?.stop();
  }
}

function createPlaybackElement(): HTMLAudioElement {
  const audio = document.createElement("audio");
  audio.autoplay = true;
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

  const transmitterAudio = createPlaybackElement();

  let monitorContext: AudioContext | null = null;
  let outputAnalyser: AnalyserNode | null = null;
  let stopOutputMonitor: (() => void) | null = null;
  let outputDeviceId = options.outputDeviceId ?? "";
  let hasReceivedOutput = false;
  let stopped = false;
  let attachGeneration = 0;
  let activeOutputTrackId: string | null = null;

  const teardownOutputMonitor = () => {
    stopOutputMonitor?.();
    stopOutputMonitor = null;
    outputAnalyser = null;
    void monitorContext?.close();
    monitorContext = null;
  };

  const attachTranslatedStream = async (outputStream: MediaStream) => {
    if (stopped) {
      return;
    }

    const generation = ++attachGeneration;

    try {
      await playRoutedAudio(transmitterAudio, outputStream, outputDeviceId);
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
      monitorContext = new AudioContext();

      if (monitorContext.state === "suspended") {
        await monitorContext.resume();
      }

      const outputSource = monitorContext.createMediaStreamSource(outputStream);
      outputAnalyser = monitorContext.createAnalyser();
      outputAnalyser.fftSize = 2048;
      outputSource.connect(outputAnalyser);
    } catch {
      outputAnalyser = null;
    }

    if (generation !== attachGeneration || stopped) {
      return;
    }

    if (outputAnalyser) {
      stopOutputMonitor = startAudioLevelMonitor(
        outputAnalyser,
        options.onOutputLevels
      );
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

  events.onmessage = ({ data }) => {
    if (stopped) {
      return;
    }

    const event = JSON.parse(data as string) as RealtimeTranslationEvent;

    if (event.type === "session.output_transcript.delta") {
      if (!hasReceivedOutput) {
        hasReceivedOutput = true;
        options.onTranslatingChange(true);
        options.onFirstOutputAudio?.();
      }

      return;
    }

    if (event.type === "session.input_transcript.delta") {
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
    activeOutputTrackId = null;
    stopInputMonitor();
    teardownOutputMonitor();
    stopPlaybackElement(transmitterAudio);
    stopPeerConnectionTracks(peerConnection);
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

    stop: cleanup,
  };
}
