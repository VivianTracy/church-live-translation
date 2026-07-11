export type AudioInputSource = "obs-streaming" | "microphone";

export const AUDIO_INPUT_SOURCE_STORAGE_KEY =
  "church-caption-audio-input-source";

export const OBS_INPUT_DEVICE_STORAGE_KEY =
  "church-caption-obs-input-device-id";

export const MICROPHONE_INPUT_DEVICE_STORAGE_KEY =
  "church-caption-microphone-input-device-id";

const VIRTUAL_CABLE_PATTERN =
  /blackhole|vb-?audio|cable|loopback|x-?usb|virtual/i;

export function isVirtualCableDevice(label: string): boolean {
  return VIRTUAL_CABLE_PATTERN.test(label);
}

export function devicesNeedMicrophonePermission(
  devices: MediaDeviceInfo[]
): boolean {
  if (devices.length === 0) {
    return true;
  }

  return devices.every((device) => !device.deviceId || !device.label);
}

export function listUsableDevices(devices: MediaDeviceInfo[]): MediaDeviceInfo[] {
  return devices.filter((device) => Boolean(device.deviceId));
}

export function loadStoredAudioInputSource(): AudioInputSource {
  if (typeof window === "undefined") {
    return "obs-streaming";
  }

  const stored = window.localStorage.getItem(AUDIO_INPUT_SOURCE_STORAGE_KEY);

  return stored === "microphone" ? "microphone" : "obs-streaming";
}

export function saveStoredAudioInputSource(source: AudioInputSource): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUDIO_INPUT_SOURCE_STORAGE_KEY, source);
}

export function loadStoredInputDeviceId(source: AudioInputSource): string {
  if (typeof window === "undefined") {
    return "";
  }

  const key =
    source === "obs-streaming"
      ? OBS_INPUT_DEVICE_STORAGE_KEY
      : MICROPHONE_INPUT_DEVICE_STORAGE_KEY;

  return window.localStorage.getItem(key) ?? "";
}

export function saveStoredInputDeviceId(
  source: AudioInputSource,
  deviceId: string
): void {
  if (typeof window === "undefined") {
    return;
  }

  const key =
    source === "obs-streaming"
      ? OBS_INPUT_DEVICE_STORAGE_KEY
      : MICROPHONE_INPUT_DEVICE_STORAGE_KEY;

  if (deviceId) {
    window.localStorage.setItem(key, deviceId);
    return;
  }

  window.localStorage.removeItem(key);
}

export function filterDevicesForInputSource(
  devices: MediaDeviceInfo[],
  source: AudioInputSource
): MediaDeviceInfo[] {
  const usableDevices = listUsableDevices(devices);

  if (source === "obs-streaming") {
    const virtualDevices = usableDevices.filter((device) =>
      isVirtualCableDevice(device.label)
    );

    return virtualDevices.length > 0 ? virtualDevices : usableDevices;
  }

  const physicalDevices = usableDevices.filter(
    (device) => !isVirtualCableDevice(device.label)
  );

  return physicalDevices;
}

export function getEmptyInputDeviceMessage(source: AudioInputSource): string {
  if (source === "obs-streaming") {
    return "No streaming input found. Install BlackHole or VB-Cable, then refresh the list.";
  }

  return "No physical microphone found. Connect a microphone or switch to OBS (Streaming).";
}

function isValidDeviceForSource(
  device: MediaDeviceInfo | undefined,
  source: AudioInputSource
): boolean {
  if (!device?.deviceId) {
    return false;
  }

  if (source === "microphone") {
    return !isVirtualCableDevice(device.label);
  }

  return true;
}

export function pickPreferredInputDevice(
  devices: MediaDeviceInfo[],
  source: AudioInputSource,
  storedDeviceId: string
): string {
  const storedDevice = devices.find((device) => device.deviceId === storedDeviceId);

  if (isValidDeviceForSource(storedDevice, source)) {
    return storedDeviceId;
  }

  if (source === "obs-streaming") {
    return (
      devices.find((device) => isVirtualCableDevice(device.label))?.deviceId ||
      devices.find((device) => device.deviceId)?.deviceId ||
      ""
    );
  }

  return (
    devices.find(
      (device) => device.deviceId && !isVirtualCableDevice(device.label)
    )?.deviceId || ""
  );
}

export function validateInputDeviceForSource(
  device: MediaDeviceInfo | undefined,
  source: AudioInputSource,
  devices: MediaDeviceInfo[] = []
): string | null {
  if (devicesNeedMicrophonePermission(devices)) {
    return null;
  }

  if (!device?.deviceId) {
    return getEmptyInputDeviceMessage(source);
  }

  if (source === "microphone" && isVirtualCableDevice(device.label)) {
    return "Microphone mode is still pointed at a virtual cable. Choose a physical microphone from the list.";
  }

  return null;
}

export function resolveInputDeviceForSource(
  devices: MediaDeviceInfo[],
  source: AudioInputSource,
  preferredDeviceId = ""
): { deviceId: string; label: string; error: string | null } {
  if (devicesNeedMicrophonePermission(devices)) {
    return {
      deviceId: "",
      label: "Not selected",
      error: null,
    };
  }

  const filtered = filterDevicesForInputSource(devices, source);

  if (filtered.length === 0) {
    return {
      deviceId: "",
      label: "Not selected",
      error: getEmptyInputDeviceMessage(source),
    };
  }

  const storedDeviceId = preferredDeviceId || loadStoredInputDeviceId(source);
  const deviceId = pickPreferredInputDevice(filtered, source, storedDeviceId);
  const device =
    devices.find((entry) => entry.deviceId === deviceId) ||
    filtered.find((entry) => entry.deviceId === deviceId);
  const error = validateInputDeviceForSource(device, source, devices);

  return {
    deviceId: error ? "" : deviceId,
    label: device?.label || (deviceId ? "Selected input" : "Not selected"),
    error,
  };
}

export function getAudioInputSourceLabel(source: AudioInputSource): string {
  return source === "obs-streaming" ? "OBS (Streaming)" : "Microphone";
}
