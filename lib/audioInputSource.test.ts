import {
  loadStoredInputDeviceId,
  pickPreferredInputDevice,
  resolveInputDeviceForSource,
  saveStoredInputDeviceId,
} from "@/lib/audioInputSource";
import {
  loadStoredAudioOutputDeviceId,
  saveStoredAudioOutputDeviceId,
} from "@/lib/audioOutputDeviceStorage";
import { afterEach, describe, expect, it, vi } from "vitest";

function device(id: string, label: string): MediaDeviceInfo {
  return {
    deviceId: id,
    groupId: "",
    kind: "audioinput",
    label,
    toJSON() {
      return this;
    },
  };
}

function mockLocalStorage() {
  const store = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("input and output device memory", () => {
  it("prefers the ClearClick / X32 board feed in streaming mode", () => {
    const devices = [
      device("blackhole", "BlackHole 2ch"),
      device("x32", "ClearClick X32"),
      device("mic", "Built-in Microphone"),
    ];

    expect(pickPreferredInputDevice(devices, "obs-streaming", "blackhole")).toBe(
      "x32"
    );
  });

  it("remembers a stored streaming device when the board feed is absent", () => {
    const devices = [
      device("blackhole", "BlackHole 2ch"),
      device("mic", "Built-in Microphone"),
    ];

    expect(pickPreferredInputDevice(devices, "obs-streaming", "blackhole")).toBe(
      "blackhole"
    );
  });

  it("keeps microphone mode on a physical mic, not a virtual cable", () => {
    const devices = [
      device("blackhole", "BlackHole 2ch"),
      device("mic", "Shure SM58"),
    ];

    expect(pickPreferredInputDevice(devices, "microphone", "blackhole")).toBe(
      "mic"
    );
  });

  it("remembers input and output devices separately", () => {
    mockLocalStorage();

    saveStoredInputDeviceId("obs-streaming", "x32");
    saveStoredInputDeviceId("microphone", "mic");
    saveStoredAudioOutputDeviceId("usb-dongle");

    expect(loadStoredInputDeviceId("obs-streaming")).toBe("x32");
    expect(loadStoredInputDeviceId("microphone")).toBe("mic");
    expect(loadStoredAudioOutputDeviceId()).toBe("usb-dongle");
  });

  it("reports a permission-needed empty list without selecting a device", () => {
    const result = resolveInputDeviceForSource(
      [device("", "")],
      "obs-streaming"
    );

    expect(result.deviceId).toBe("");
    expect(result.error).toBeNull();
  });
});
