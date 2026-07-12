export type AudioInputSource = "obs-streaming" | "microphone";

export const AUDIO_INPUT_SOURCE_STORAGE_KEY =
  "church-caption-audio-input-source";

export const OBS_INPUT_DEVICE_STORAGE_KEY =
  "church-caption-obs-input-device-id";

export const MICROPHONE_INPUT_DEVICE_STORAGE_KEY =
  "church-caption-microphone-input-device-id";

/**
 * Church board feed over USB (X32 X-USB, ClearClick interface, Behringer).
 * These are real hardware inputs OBS also lists — not software loopbacks.
 */
const BOARD_FEED_PATTERN = /clearclick|clear.?click|x-?usb|x32|behringer/i;

/** Software loopback devices used when routing through OBS. */
const VIRTUAL_CABLE_PATTERN =
  /blackhole|vb-?audio|cable|loopback|virtual/i;

/** Prefer stereo BlackHole / VB-Cable over multichannel variants. */
const PREFERRED_VIRTUAL_CABLE_PATTERN =
  /blackhole\s*2|2\s*ch|cable output|vb-?audio/i;

export function isBoardFeedDevice(label: string): boolean {
  return BOARD_FEED_PATTERN.test(label);
}

/** @deprecated Use isBoardFeedDevice — kept for existing imports. */
export function isMixerUsbDevice(label: string): boolean {
  return isBoardFeedDevice(label);
}

export function isVirtualCableDevice(label: string): boolean {
  // Board feeds are real USB interfaces, not software loopbacks.
  if (isBoardFeedDevice(label)) {
    return false;
  }

  return VIRTUAL_CABLE_PATTERN.test(label);
}

export function isStreamingInputDevice(label: string): boolean {
  return isBoardFeedDevice(label) || isVirtualCableDevice(label);
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

  // OBS (Streaming) shows every system audio input Chrome can see — same set
  // OBS lists (ClearClick, BlackHole, Default, etc.). Preference is applied
  // when auto-selecting, not by hiding devices.
  if (source === "obs-streaming") {
    return usableDevices;
  }

  const physicalDevices = usableDevices.filter(
    (device) => !isVirtualCableDevice(device.label)
  );

  return physicalDevices;
}

export function getEmptyInputDeviceMessage(source: AudioInputSource): string {
  if (source === "obs-streaming") {
    return "No audio input found. Connect ClearClick / X32, allow microphone access, then refresh.";
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

function findFirstDeviceId(
  devices: MediaDeviceInfo[],
  predicate: (device: MediaDeviceInfo) => boolean
): string {
  return devices.find((device) => device.deviceId && predicate(device))?.deviceId || "";
}

function pickPreferredVirtualCableId(devices: MediaDeviceInfo[]): string {
  return (
    findFirstDeviceId(devices, (device) =>
      PREFERRED_VIRTUAL_CABLE_PATTERN.test(device.label)
    ) ||
    findFirstDeviceId(devices, (device) => isVirtualCableDevice(device.label))
  );
}

/**
 * Prefer ClearClick / X32 board feed, then a remembered choice, then BlackHole 2ch.
 */
export function pickPreferredInputDevice(
  devices: MediaDeviceInfo[],
  source: AudioInputSource,
  storedDeviceId: string
): string {
  const storedDevice = devices.find((device) => device.deviceId === storedDeviceId);
  const boardFeedDeviceId = findFirstDeviceId(devices, (device) =>
    isBoardFeedDevice(device.label)
  );

  if (source === "obs-streaming") {
    // Sunday default: ClearClick / X32 when the board feed is connected.
    if (boardFeedDeviceId) {
      if (
        storedDevice &&
        isValidDeviceForSource(storedDevice, source) &&
        isBoardFeedDevice(storedDevice.label)
      ) {
        return storedDeviceId;
      }

      return boardFeedDeviceId;
    }

    if (isValidDeviceForSource(storedDevice, source)) {
      return storedDeviceId;
    }

    return (
      pickPreferredVirtualCableId(devices) ||
      findFirstDeviceId(devices, () => true) ||
      ""
    );
  }

  if (isValidDeviceForSource(storedDevice, source)) {
    return storedDeviceId;
  }

  if (boardFeedDeviceId) {
    return boardFeedDeviceId;
  }

  return findFirstDeviceId(
    devices,
    (device) => !isVirtualCableDevice(device.label)
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
