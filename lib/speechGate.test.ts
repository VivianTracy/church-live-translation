import {
  applySpeechGateChannels,
  createSpeechGateState,
  SPEECH_GATE_HANGOVER_MS,
  SPEECH_GATE_NOISE_FLOOR,
} from "@/lib/speechGate";
import { describe, expect, it } from "vitest";

const SAMPLE_RATE = 48_000;
const BLOCK_SAMPLES = 480;

function constantBlock(amplitude: number, channels = 1): Float32Array[] {
  return Array.from({ length: channels }, () =>
    new Float32Array(BLOCK_SAMPLES).fill(amplitude)
  );
}

function maxAbs(channels: Float32Array[]): number {
  let peak = 0;

  for (const channel of channels) {
    for (const sample of channel) {
      peak = Math.max(peak, Math.abs(sample));
    }
  }

  return peak;
}

describe("speech gate", () => {
  it("sends silence until speech rises above the noise floor", () => {
    const noise = SPEECH_GATE_NOISE_FLOOR / 4;
    const first = applySpeechGateChannels(
      createSpeechGateState(),
      constantBlock(noise),
      SAMPLE_RATE
    );

    expect(first.state.open).toBe(false);
    expect(maxAbs(first.channels)).toBe(0);
  });

  it("opens on speech, including speech on a later channel", () => {
    const silent = new Float32Array(BLOCK_SAMPLES);
    const speech = new Float32Array(BLOCK_SAMPLES).fill(0.2);
    const gated = applySpeechGateChannels(
      createSpeechGateState(),
      [silent, speech],
      SAMPLE_RATE
    );

    expect(gated.state.open).toBe(true);
    expect(maxAbs([gated.channels[1] ?? new Float32Array()])).toBeGreaterThan(0.05);
    expect(maxAbs([gated.channels[0] ?? new Float32Array()])).toBe(0);
  });

  it("keeps a short tail after speech, then returns to silence", () => {
    const opened = applySpeechGateChannels(
      createSpeechGateState(),
      constantBlock(0.2),
      SAMPLE_RATE
    );
    const blockMs = (BLOCK_SAMPLES / SAMPLE_RATE) * 1000;
    const hangoverBlocks = Math.floor(SPEECH_GATE_HANGOVER_MS / blockMs) - 1;
    let state = opened.state;

    for (let block = 0; block < hangoverBlocks; block += 1) {
      const gated = applySpeechGateChannels(
        state,
        constantBlock(SPEECH_GATE_NOISE_FLOOR / 4),
        SAMPLE_RATE
      );
      state = gated.state;
      expect(state.open).toBe(true);
      expect(maxAbs(gated.channels)).toBeGreaterThan(0);
    }

    const closing = applySpeechGateChannels(
      state,
      constantBlock(SPEECH_GATE_NOISE_FLOOR / 4),
      SAMPLE_RATE
    );
    let released = closing;

    for (let block = 0; block < 80 && released.state.gain > 0; block += 1) {
      released = applySpeechGateChannels(
        released.state,
        constantBlock(SPEECH_GATE_NOISE_FLOOR / 4),
        SAMPLE_RATE
      );
    }

    expect(released.state.open).toBe(false);
    expect(released.state.gain).toBe(0);

    const silent = applySpeechGateChannels(
      released.state,
      constantBlock(SPEECH_GATE_NOISE_FLOOR / 4),
      SAMPLE_RATE
    );

    expect(maxAbs(silent.channels)).toBe(0);
  });
});
