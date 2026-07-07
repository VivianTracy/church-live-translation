/** Mic constraints for live caption capture (incl. BlackHole / OBS loopback). */
export const CAPTION_MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: { ideal: 1 },
};

export type MicrophoneStreamInfo = {
  stream: MediaStream;
  label: string;
  channelCount: number;
  sampleRate?: number;
  readyState: MediaStreamTrackState;
};

export async function getCaptionMicrophoneStream(
  deviceId?: string
): Promise<MicrophoneStreamInfo> {
  const audio: MediaTrackConstraints = {
    ...CAPTION_MIC_CONSTRAINTS,
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  };

  const stream = await navigator.mediaDevices.getUserMedia({
    audio,
  });

  const track = stream.getAudioTracks()[0];

  if (!track) {
    throw new Error("No audio track available from microphone.");
  }

  const settings = track.getSettings();

  return {
    stream,
    label: track.label || "Unknown microphone",
    channelCount: settings.channelCount ?? 1,
    sampleRate: settings.sampleRate,
    readyState: track.readyState,
  };
}
