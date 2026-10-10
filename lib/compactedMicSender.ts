import {
  compactCapturedSilence,
  createSilenceCompactorState,
  type SilenceCompactorState,
} from "@/lib/silenceCompactor";

const TARGET_SAMPLE_RATE = 24000;
const PROCESSOR_BUFFER_SIZE = 2048;

function mixChannel(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const mixed = new Float32Array(length);
  const channels = buffer.numberOfChannels;

  if (channels === 0 || length === 0) {
    return mixed;
  }

  for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex);

    for (let index = 0; index < length; index += 1) {
      mixed[index] += (channel[index] ?? 0) / channels;
    }
  }

  return mixed;
}

function resample(input: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (input.length === 0 || sourceRate === targetRate) {
    return input;
  }

  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(0, Math.floor(input.length / ratio));
  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    output[index] = input[Math.floor(index * ratio)] ?? 0;
  }

  return output;
}

function floatToPcm16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);

  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
    output[index] = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
  }

  return output;
}

export function pcm16ToBase64(pcm16: Int16Array): string {
  const bytes = new Uint8Array(pcm16.length * 2);
  const view = new DataView(bytes.buffer);

  for (let index = 0; index < pcm16.length; index += 1) {
    view.setInt16(index * 2, pcm16[index] ?? 0, true);
  }

  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }

  return btoa(binary);
}

/**
 * Send speech plus a short pause. Silent gaps longer than that are not sent,
 * so they do not occupy translation context. The raw mic meter stays separate.
 */
export function startCompactedMicSender(
  context: AudioContext,
  source: MediaStreamAudioSourceNode,
  onPcm16: (pcm16: Int16Array) => void
): () => void {
  const processor = context.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1);
  const keepAlive = context.createGain();
  keepAlive.gain.value = 0;
  let state: SilenceCompactorState = createSilenceCompactorState(context.sampleRate);

  processor.onaudioprocess = (event) => {
    const mixed = mixChannel(event.inputBuffer);
    const compacted = compactCapturedSilence(state, mixed, event.inputBuffer.sampleRate);
    state = compacted.state;
    const pcm16 = floatToPcm16(
      resample(compacted.samples, event.inputBuffer.sampleRate, TARGET_SAMPLE_RATE)
    );

    if (pcm16.length > 0) {
      onPcm16(pcm16);
    }
  };

  source.connect(processor);
  processor.connect(keepAlive);
  keepAlive.connect(context.destination);

  return () => {
    processor.onaudioprocess = null;
    processor.disconnect();
    keepAlive.disconnect();
  };
}
