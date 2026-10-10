/** Takes the edge off bright headset speech without changing the words. */
export const TRANSLATION_HIGHSHELF_FREQUENCY_HZ = 3500;
export const TRANSLATION_HIGHSHELF_GAIN_DB = -5;

export const TRANSLATION_COMPRESSOR = {
  threshold: -16,
  knee: 10,
  ratio: 8,
  attack: 0.003,
  release: 0.15,
} as const;

type AudioParamValue = { value: number };

export function applyTranslationHighShelf(filter: {
  type: BiquadFilterType;
  frequency: AudioParamValue;
  gain: AudioParamValue;
}): void {
  filter.type = "highshelf";
  filter.frequency.value = TRANSLATION_HIGHSHELF_FREQUENCY_HZ;
  filter.gain.value = TRANSLATION_HIGHSHELF_GAIN_DB;
}

export function applyTranslationCompressor(compressor: {
  threshold: AudioParamValue;
  knee: AudioParamValue;
  ratio: AudioParamValue;
  attack: AudioParamValue;
  release: AudioParamValue;
}): void {
  compressor.threshold.value = TRANSLATION_COMPRESSOR.threshold;
  compressor.knee.value = TRANSLATION_COMPRESSOR.knee;
  compressor.ratio.value = TRANSLATION_COMPRESSOR.ratio;
  compressor.attack.value = TRANSLATION_COMPRESSOR.attack;
  compressor.release.value = TRANSLATION_COMPRESSOR.release;
}

export type TranslationToneGraph = {
  context: AudioContext;
  gain: GainNode;
  analyser: AnalyserNode;
  stream: MediaStream;
};

type AudioContextWithSink = AudioContext & {
  setSinkId?: (sinkId: string) => Promise<void>;
};

/** Play through the chosen output. An empty id keeps the system default. */
export async function routeTranslationOutputDevice(
  context: AudioContext,
  deviceId: string
): Promise<void> {
  const sinkContext = context as AudioContextWithSink;

  if (typeof sinkContext.setSinkId !== "function") {
    return;
  }

  await sinkContext.setSinkId(deviceId);
}

export async function createTranslationToneGraph(
  outputStream: MediaStream,
  volume: number
): Promise<TranslationToneGraph> {
  const context = new AudioContext();

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    const source = context.createMediaStreamSource(outputStream);
    const highShelf = context.createBiquadFilter();
    const compressor = context.createDynamicsCompressor();
    const gain = context.createGain();
    const analyser = context.createAnalyser();
    const destination = context.createMediaStreamDestination();

    applyTranslationHighShelf(highShelf);
    applyTranslationCompressor(compressor);
    gain.gain.value = volume;
    analyser.fftSize = 2048;

    source.connect(highShelf);
    highShelf.connect(compressor);
    compressor.connect(gain);
    gain.connect(analyser);
    analyser.connect(destination);

    return { context, gain, analyser, stream: destination.stream };
  } catch (error) {
    void context.close();
    throw error;
  }
}
