import { describe, expect, it } from "vitest";
import {
  CAPTURED_SILENCE_RMS,
  KEPT_PAUSE_MS,
  SPEECH_PREROLL_MS,
  compactCapturedSilence,
  createSilenceCompactorState,
} from "@/lib/silenceCompactor";

const SAMPLE_RATE = 1000;

function tone(length: number, level: number): Float32Array {
  return new Float32Array(length).fill(level);
}

describe("compactCapturedSilence", () => {
  it("passes speech through unchanged", () => {
    const state = createSilenceCompactorState(SAMPLE_RATE);
    const speech = tone(400, 0.2);
    const result = compactCapturedSilence(state, speech, SAMPLE_RATE);

    expect(Array.from(result.samples)).toEqual(Array.from(speech));
  });

  it("keeps quiet speech that is still above the silence floor", () => {
    const state = createSilenceCompactorState(SAMPLE_RATE);
    const speech = tone(300, CAPTURED_SILENCE_RMS);
    const result = compactCapturedSilence(state, speech, SAMPLE_RATE);

    expect(result.samples.length).toBe(speech.length);
  });

  it("drops leading silence and keeps a short onset when speech starts", () => {
    const state = createSilenceCompactorState(SAMPLE_RATE);
    const lead = compactCapturedSilence(state, tone(2000, 0), SAMPLE_RATE);

    expect(lead.samples.length).toBe(0);

    const speech = tone(100, 0.2);
    const result = compactCapturedSilence(lead.state, speech, SAMPLE_RATE);

    expect(result.samples.length).toBe(SPEECH_PREROLL_MS + speech.length);
    expect(result.samples[SPEECH_PREROLL_MS]).toBeCloseTo(0.2);
  });

  it("keeps a short pause and omits the rest of a silent gap", () => {
    const state = createSilenceCompactorState(SAMPLE_RATE);
    const started = compactCapturedSilence(state, tone(100, 0.2), SAMPLE_RATE);
    const pause = compactCapturedSilence(started.state, tone(2000, 0), SAMPLE_RATE);

    expect(pause.samples.length).toBe(KEPT_PAUSE_MS);

    const moreSilence = compactCapturedSilence(pause.state, tone(500, 0), SAMPLE_RATE);

    expect(moreSilence.samples.length).toBe(0);
  });

  it("restores the last moment of a long gap when speech returns", () => {
    const state = createSilenceCompactorState(SAMPLE_RATE);
    const started = compactCapturedSilence(state, tone(50, 0.2), SAMPLE_RATE);
    const paused = compactCapturedSilence(started.state, tone(3000, 0), SAMPLE_RATE);
    const speech = tone(80, 0.4);
    const result = compactCapturedSilence(paused.state, speech, SAMPLE_RATE);

    expect(result.samples.length).toBe(SPEECH_PREROLL_MS + speech.length);
    expect(result.samples.at(-1)).toBeCloseTo(0.4);
  });
});
