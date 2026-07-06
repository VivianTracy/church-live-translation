const TARGET_SAMPLE_RATE = 24000;

function floatToPcm16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);

  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}

function resampleToPcm16(
  input: Float32Array,
  sourceRate: number,
  targetRate: number
): Int16Array {
  if (sourceRate === targetRate) {
    return floatToPcm16(input);
  }

  const ratio = sourceRate / targetRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = Math.floor(index * ratio);
    const sample = Math.max(-1, Math.min(1, input[sourceIndex] ?? 0));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}

function mixInputBuffer(inputBuffer: AudioBuffer): Float32Array {
  const length = inputBuffer.length;
  const mixed = new Float32Array(length);
  const channels = inputBuffer.numberOfChannels;

  if (channels === 0) {
    return mixed;
  }

  for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
    const channel = inputBuffer.getChannelData(channelIndex);

    for (let index = 0; index < length; index += 1) {
      mixed[index] += (channel[index] ?? 0) / channels;
    }
  }

  return mixed;
}

function computeRms(input: Float32Array): number {
  if (input.length === 0) {
    return 0;
  }

  let sum = 0;

  for (let index = 0; index < input.length; index += 1) {
    const sample = input[index] ?? 0;
    sum += sample * sample;
  }

  return Math.sqrt(sum / input.length);
}

function computePeak(input: Float32Array): number {
  let peak = 0;

  for (let index = 0; index < input.length; index += 1) {
    peak = Math.max(peak, Math.abs(input[index] ?? 0));
  }

  return peak;
}

function concatPcm16(chunks: Int16Array[]): Int16Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Int16Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

export function encodePcm16ToWavBase64(
  pcm16: Int16Array,
  sampleRate = TARGET_SAMPLE_RATE
): string {
  const dataLength = pcm16.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataLength, true);

  const pcmBytes = new Int16Array(buffer, 44);
  pcmBytes.set(pcm16);

  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }

  return btoa(binary);
}

export type PcmChunkStats = {
  rms: number;
  peak: number;
  durationMs: number;
  sampleCount: number;
  bufferCount: number;
};

export type PcmChunkRecorder = {
  stop: () => void;
  getAudioContextState: () => AudioContextState;
};

export async function startPcmChunkRecorder(
  stream: MediaStream,
  chunkMs: number,
  minRms: number,
  onChunk: (wavBase64: string, stats: PcmChunkStats) => void
): Promise<PcmChunkRecorder> {
  const audioContext = new AudioContext();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentGain = audioContext.createGain();
  const sourceRate = audioContext.sampleRate;
  const pendingChunks: Int16Array[] = [];
  let pendingRmsTotal = 0;
  let pendingPeak = 0;
  let pendingRmsSamples = 0;
  let chunkTimer: ReturnType<typeof setInterval> | null = null;
  let processCallbacks = 0;

  silentGain.gain.value = 0;

  processor.onaudioprocess = (event) => {
    processCallbacks += 1;
    const mixed = mixInputBuffer(event.inputBuffer);
    const pcm16 = resampleToPcm16(mixed, sourceRate, TARGET_SAMPLE_RATE);

    if (pcm16.length === 0) {
      return;
    }

    pendingChunks.push(pcm16);
    pendingRmsTotal += computeRms(mixed);
    pendingPeak = Math.max(pendingPeak, computePeak(mixed));
    pendingRmsSamples += 1;
  };

  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(audioContext.destination);

  const flushChunk = () => {
    if (pendingChunks.length === 0) {
      onChunk("", {
        rms: 0,
        peak: 0,
        durationMs: 0,
        sampleCount: 0,
        bufferCount: processCallbacks,
      });
      return;
    }

    const pcm16 = concatPcm16(pendingChunks);
    pendingChunks.length = 0;

    const rms =
      pendingRmsSamples > 0 ? pendingRmsTotal / pendingRmsSamples : 0;
    const peak = pendingPeak;
    pendingRmsTotal = 0;
    pendingPeak = 0;
    pendingRmsSamples = 0;

    const stats: PcmChunkStats = {
      rms,
      peak,
      durationMs: Math.round((pcm16.length / TARGET_SAMPLE_RATE) * 1000),
      sampleCount: pcm16.length,
      bufferCount: processCallbacks,
    };

    if (rms < minRms && peak < minRms) {
      onChunk("", stats);
      return;
    }

    onChunk(encodePcm16ToWavBase64(pcm16), stats);
  };

  chunkTimer = setInterval(flushChunk, chunkMs);

  return {
    getAudioContextState() {
      return audioContext.state;
    },
    stop() {
      if (chunkTimer) {
        clearInterval(chunkTimer);
        chunkTimer = null;
      }

      flushChunk();
      processor.disconnect();
      source.disconnect();
      silentGain.disconnect();
      void audioContext.close();
    },
  };
}
