import { clampAudioOutputVolume } from "@/lib/audioOutputVolumeStorage";

const TEST_TONE_MS = 900;

const TEST_NOTES = [
  { frequency: 523.25, start: 0, duration: 0.28 },
  { frequency: 659.25, start: 0.34, duration: 0.42 },
];

let activeStop: (() => void) | null = null;

export function stopOutputTestTone(): void {
  const stop = activeStop;
  activeStop = null;
  stop?.();
}

export function describeOutputTestFailure(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);

  if (name === "NotAllowedError") {
    return "The browser blocked the test sound. Click Test sound again.";
  }

  if (name === "NotFoundError" || /device/i.test(message)) {
    return "That output is not available. Refresh the list and choose it again.";
  }

  return "Could not play the test sound on that output.";
}

function canChooseOutputDevice(): boolean {
  return typeof HTMLAudioElement !== "undefined" && "setSinkId" in HTMLAudioElement.prototype;
}

/**
 * Play a short chime through the same output element the headset translation uses.
 * Returns an error message, or null when the chime finishes.
 */
export async function playOutputTestTone(options: {
  deviceId: string;
  volume: number;
}): Promise<string | null> {
  const volume = clampAudioOutputVolume(options.volume);

  if (volume === 0) {
    return "Turn the output volume up, then test again.";
  }

  if (options.deviceId && !canChooseOutputDevice()) {
    return "Use Chrome or Edge to choose this output, then test again.";
  }

  if (typeof AudioContext === "undefined" || typeof document === "undefined") {
    return "Could not play the test sound on that output.";
  }

  stopOutputTestTone();

  const context = new AudioContext();
  const audio = document.createElement("audio");
  let stopped = false;

  const stop = () => {
    if (stopped) {
      return;
    }

    stopped = true;
    audio.pause();
    audio.srcObject = null;
    audio.remove();
    void context.close();
  };

  activeStop = stop;

  try {
    const destination = context.createMediaStreamDestination();
    const now = context.currentTime;

    for (const note of TEST_NOTES) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + note.start;
      const end = start + note.duration;

      oscillator.type = "sine";
      oscillator.frequency.value = note.frequency;
      oscillator.connect(gain);
      gain.connect(destination);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
      gain.gain.setValueAtTime(0.35, end - 0.06);
      gain.gain.linearRampToValueAtTime(0, end);
      oscillator.start(start);
      oscillator.stop(end);
    }

    audio.autoplay = true;
    audio.volume = volume;
    audio.srcObject = destination.stream;
    audio.setAttribute("playsinline", "true");
    audio.style.display = "none";
    document.body.appendChild(audio);

    if (context.state === "suspended") {
      await context.resume();
    }

    if (options.deviceId) {
      await audio.setSinkId(options.deviceId);
    }

    await audio.play();
    await new Promise((resolve) => window.setTimeout(resolve, TEST_TONE_MS));

    if (activeStop === stop) {
      stop();
      activeStop = null;
    }

    return null;
  } catch (error) {
    if (activeStop === stop) {
      stop();
      activeStop = null;
    }

    return describeOutputTestFailure(error);
  }
}
