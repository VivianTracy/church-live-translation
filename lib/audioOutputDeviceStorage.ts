export const AUDIO_OUTPUT_DEVICE_STORAGE_KEY =
  "church-caption-audio-output-device-id";

export function loadStoredAudioOutputDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUDIO_OUTPUT_DEVICE_STORAGE_KEY) ?? "";
}

export function saveStoredAudioOutputDeviceId(deviceId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  if (deviceId) {
    window.localStorage.setItem(AUDIO_OUTPUT_DEVICE_STORAGE_KEY, deviceId);
    return;
  }

  window.localStorage.removeItem(AUDIO_OUTPUT_DEVICE_STORAGE_KEY);
}

export async function listAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    throw new Error(
      "Audio output device listing is not supported in this browser."
    );
  }

  const devices = await navigator.mediaDevices.enumerateDevices();

  return devices.filter((device) => device.kind === "audiooutput");
}
