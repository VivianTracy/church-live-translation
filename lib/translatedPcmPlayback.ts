const PCM_SAMPLE_RATE = 24000;
const START_LEAD_SECONDS = 0.08;

export type TranslatedPcmPlayback = {
  context: AudioContext;
  stream: MediaStream;
  analyser: AnalyserNode;
  pushPcm16: (pcm16: Int16Array) => void;
  stop: () => void;
};

function decodeBase64Pcm16(audio: string): Int16Array {
  const binary = atob(audio);
  const length = Math.floor(binary.length / 2);
  const bytes = new Uint8Array(binary.length);
  const pcm16 = new Int16Array(length);
  const view = new DataView(bytes.buffer);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  for (let index = 0; index < length; index += 1) {
    pcm16[index] = view.getInt16(index * 2, true);
  }

  return pcm16;
}

export function readTranslationAudioDelta(event: { delta?: string; audio?: string }): Int16Array | null {
  const encoded = event.delta || event.audio;

  if (!encoded) {
    return null;
  }

  try {
    const pcm16 = decodeBase64Pcm16(encoded);
    return pcm16.length > 0 ? pcm16 : null;
  } catch {
    return null;
  }
}

/** Play model PCM through a media stream. The audio element is the speaker. */
export function startTranslatedPcmPlayback(): TranslatedPcmPlayback {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  const destination = context.createMediaStreamDestination();
  analyser.fftSize = 2048;
  analyser.connect(destination);

  let nextTime = 0;
  let stopped = false;

  return {
    context,
    stream: destination.stream,
    analyser,
    pushPcm16(pcm16: Int16Array) {
      if (stopped || pcm16.length === 0 || context.state === "closed") {
        return;
      }

      const buffer = context.createBuffer(1, pcm16.length, PCM_SAMPLE_RATE);
      const channel = buffer.getChannelData(0);

      for (let index = 0; index < pcm16.length; index += 1) {
        channel[index] = Math.max(-1, Math.min(1, (pcm16[index] ?? 0) / 32768));
      }

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(analyser);

      const now = context.currentTime;

      if (nextTime < now + 0.02) {
        nextTime = now + START_LEAD_SECONDS;
      }

      source.start(nextTime);
      nextTime += buffer.duration;
      source.onended = () => {
        source.disconnect();
      };
    },
    stop() {
      stopped = true;
      analyser.disconnect();
      destination.disconnect();
    },
  };
}
