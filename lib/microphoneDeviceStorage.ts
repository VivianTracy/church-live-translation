export const MIC_DEVICE_STORAGE_KEY = "church-caption-mic-device-id";

export function loadStoredMicDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(MIC_DEVICE_STORAGE_KEY) ?? "";
}

export function saveStoredMicDeviceId(deviceId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  if (deviceId) {
    window.localStorage.setItem(MIC_DEVICE_STORAGE_KEY, deviceId);
    return;
  }

  window.localStorage.removeItem(MIC_DEVICE_STORAGE_KEY);
}

export async function listMicrophoneDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    throw new Error("Microphone device listing is not supported in this browser.");
  }

  const devices = await navigator.mediaDevices.enumerateDevices();

  return devices.filter((device) => device.kind === "audioinput");
}

export async function requestMicrophonePermission(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
}
