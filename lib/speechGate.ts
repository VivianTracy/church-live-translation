/** RMS below this is treated as room tone, not speech. About -38 dBFS. */
export const SPEECH_GATE_NOISE_FLOOR = 0.012;

/** Keep the gate open this long after speech drops, so word endings stay. */
export const SPEECH_GATE_HANGOVER_MS = 400;

/** How fast the gate opens once speech is heard. */
export const SPEECH_GATE_ATTACK_MS = 10;

/** How fast the gate falls to silence after the hangover. */
export const SPEECH_GATE_RELEASE_MS = 40;

const SPEECH_GATE_BUFFER_SIZE = 1024;

export type SpeechGateState = {
  open: boolean;
  gain: number;
  quietMs: number;
};

export function createSpeechGateState(): SpeechGateState {
  return { open: false, gain: 0, quietMs: 0 };
}

function channelRms(samples: ArrayLike<number>): number {
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

export function applySpeechGateChannels(
  state: SpeechGateState,
  channels: ArrayLike<number>[],
  sampleRate: number
): { state: SpeechGateState; channels: Float32Array[] } {
  const length = channels[0]?.length ?? 0;
  const outputs = channels.map((channel) => new Float32Array(channel.length));

  if (length === 0 || channels.length === 0 || sampleRate <= 0) {
    return { state, channels: outputs };
  }

  let maxRms = 0;

  for (const channel of channels) {
    maxRms = Math.max(maxRms, channelRms(channel));
  }

  let { open, gain, quietMs } = state;
  const blockMs = (length / sampleRate) * 1000;

  if (maxRms >= SPEECH_GATE_NOISE_FLOOR) {
    open = true;
    quietMs = 0;
  } else if (open) {
    quietMs += blockMs;

    if (quietMs >= SPEECH_GATE_HANGOVER_MS) {
      open = false;
    }
  }

  const target = open ? 1 : 0;
  const tauMs = target > gain ? SPEECH_GATE_ATTACK_MS : SPEECH_GATE_RELEASE_MS;
  const tauSamples = Math.max(1, (tauMs / 1000) * sampleRate);

  for (let index = 0; index < length; index += 1) {
    gain += (target - gain) / tauSamples;

    for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
      const output = outputs[channelIndex];

      if (!output) {
        continue;
      }

      output[index] = (channels[channelIndex]?.[index] ?? 0) * gain;
    }
  }

  if (!open && gain < 0.0001) {
    gain = 0;
  }

  return {
    state: { open, gain, quietMs },
    channels: outputs,
  };
}

export type SpeechGateOutput = {
  stream: MediaStream;
  stop: () => void;
};

export function startInputSpeechGate(
  context: AudioContext,
  source: MediaStreamAudioSourceNode
): SpeechGateOutput {
  const processor = context.createScriptProcessor(SPEECH_GATE_BUFFER_SIZE, 1, 1);
  const destination = context.createMediaStreamDestination();
  const keepAlive = context.createGain();
  keepAlive.gain.value = 0;
  let state = createSpeechGateState();

  processor.onaudioprocess = (event) => {
    const inputChannels: Float32Array[] = [];

    for (
      let channelIndex = 0;
      channelIndex < event.inputBuffer.numberOfChannels;
      channelIndex += 1
    ) {
      inputChannels.push(event.inputBuffer.getChannelData(channelIndex));
    }

    const gated = applySpeechGateChannels(
      state,
      inputChannels,
      event.inputBuffer.sampleRate
    );
    state = gated.state;

    for (
      let channelIndex = 0;
      channelIndex < event.outputBuffer.numberOfChannels;
      channelIndex += 1
    ) {
      const output = event.outputBuffer.getChannelData(channelIndex);
      const sourceChannel =
        gated.channels[Math.min(channelIndex, gated.channels.length - 1)];

      if (!sourceChannel || sourceChannel.length !== output.length) {
        output.fill(0);
        continue;
      }

      output.set(sourceChannel);
    }
  };

  source.connect(processor);
  processor.connect(destination);
  processor.connect(keepAlive);
  keepAlive.connect(context.destination);

  return {
    stream: destination.stream,
    stop() {
      processor.onaudioprocess = null;
      processor.disconnect();
      keepAlive.disconnect();
      destination.disconnect();
    },
  };
}
