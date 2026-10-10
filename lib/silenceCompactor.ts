/** Near-silence. About -42 dBFS. Quiet speech stays above this. */
export const CAPTURED_SILENCE_RMS = 0.008;

/**
 * Pause kept after speech so a sentence break is still in the audio.
 * Longer gaps, where the mic captured nothing, are left out.
 */
export const KEPT_PAUSE_MS = 700;

/** Audio kept from just before speech returns, so the first syllable is not cut. */
export const SPEECH_PREROLL_MS = 200;

export type SilenceCompactorState = {
  heardSpeech: boolean;
  dropping: boolean;
  keptSilenceSamples: number;
  preroll: Float32Array;
  prerollUsed: number;
};

export function createSilenceCompactorState(
  sampleRate: number
): SilenceCompactorState {
  const prerollSamples = Math.max(1, Math.round((sampleRate * SPEECH_PREROLL_MS) / 1000));

  return {
    heardSpeech: false,
    dropping: false,
    keptSilenceSamples: 0,
    preroll: new Float32Array(prerollSamples),
    prerollUsed: 0,
  };
}

function blockRms(samples: ArrayLike<number>): number {
  if (samples.length === 0) {
    return 0;
  }

  let sum = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index] ?? 0;
    sum += sample * sample;
  }

  return Math.sqrt(sum / samples.length);
}

function appendPreroll(state: SilenceCompactorState, samples: Float32Array): void {
  const capacity = state.preroll.length;

  if (capacity === 0 || samples.length === 0) {
    return;
  }

  if (samples.length >= capacity) {
    state.preroll.set(samples.subarray(samples.length - capacity));
    state.prerollUsed = capacity;
    return;
  }

  const combined = state.prerollUsed + samples.length;

  if (combined <= capacity) {
    state.preroll.set(samples, state.prerollUsed);
    state.prerollUsed += samples.length;
    return;
  }

  const overflow = combined - capacity;
  state.preroll.copyWithin(0, overflow, state.prerollUsed);
  state.preroll.set(samples, state.prerollUsed - overflow);
  state.prerollUsed = capacity;
}

function takePreroll(state: SilenceCompactorState): Float32Array {
  const kept = state.preroll.slice(0, state.prerollUsed);
  state.prerollUsed = 0;
  return kept;
}

function concatSamples(head: Float32Array, tail: Float32Array): Float32Array {
  if (head.length === 0) {
    return tail;
  }

  if (tail.length === 0) {
    return head;
  }

  const combined = new Float32Array(head.length + tail.length);
  combined.set(head, 0);
  combined.set(tail, head.length);
  return combined;
}

/**
 * Keep speech and a short captured pause. Omit the rest of a silent gap so it
 * does not fill the translation context.
 */
export function compactCapturedSilence(
  state: SilenceCompactorState,
  samples: Float32Array,
  sampleRate: number
): { state: SilenceCompactorState; samples: Float32Array } {
  if (samples.length === 0 || sampleRate <= 0) {
    return { state, samples: new Float32Array(0) };
  }

  const keepSilenceSamples = Math.round((sampleRate * KEPT_PAUSE_MS) / 1000);

  if (blockRms(samples) >= CAPTURED_SILENCE_RMS) {
    const lead = state.dropping || !state.heardSpeech ? takePreroll(state) : new Float32Array(0);
    state.heardSpeech = true;
    state.dropping = false;
    state.keptSilenceSamples = 0;
    return { state, samples: concatSamples(lead, samples) };
  }

  if (!state.heardSpeech) {
    appendPreroll(state, samples);
    state.dropping = true;
    return { state, samples: new Float32Array(0) };
  }

  if (state.dropping) {
    appendPreroll(state, samples);
    return { state, samples: new Float32Array(0) };
  }

  const remaining = Math.max(0, keepSilenceSamples - state.keptSilenceSamples);
  const keep = Math.min(samples.length, remaining);
  state.keptSilenceSamples += keep;

  if (keep < samples.length) {
    appendPreroll(state, samples.subarray(keep));
    state.dropping = true;
  }

  return { state, samples: samples.subarray(0, keep) };
}
