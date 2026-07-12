"use client";

import {
  devicesNeedMicrophonePermission,
  filterDevicesForInputSource,
  isMixerUsbDevice,
  isStreamingInputDevice,
  loadStoredAudioInputSource,
  resolveInputDeviceForSource,
  saveStoredInputDeviceId,
  type AudioInputSource,
} from "@/lib/audioInputSource";
import {
  listMicrophoneDevices,
  requestMicrophonePermission,
} from "@/lib/microphoneDeviceStorage";
import { useEffect, useRef, useState } from "react";

type AudioInputSourceCardProps = {
  selectedSource: AudioInputSource;
  selectedDeviceId: string;
  disabled?: boolean;
  onSourceChange: (source: AudioInputSource) => void | Promise<void>;
  onDeviceChange: (deviceId: string) => void;
};

export function AudioInputSourceCard({
  selectedSource,
  selectedDeviceId,
  disabled = false,
  onSourceChange,
  onDeviceChange,
}: AudioInputSourceCardProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [visibleDevices, setVisibleDevices] = useState<MediaDeviceInfo[]>([]);
  const [loadError, setLoadError] = useState("");
  const [needsPermission, setNeedsPermission] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const selectedSourceRef = useRef(selectedSource);
  const selectedDeviceIdRef = useRef(selectedDeviceId);

  selectedSourceRef.current = selectedSource;
  selectedDeviceIdRef.current = selectedDeviceId;

  const applyDeviceList = (
    inputs: MediaDeviceInfo[],
    source: AudioInputSource,
    preferredDeviceId = selectedDeviceIdRef.current
  ) => {
    const permissionRequired = devicesNeedMicrophonePermission(inputs);
    const filtered = filterDevicesForInputSource(inputs, source);
    const resolved = resolveInputDeviceForSource(
      inputs,
      source,
      preferredDeviceId
    );

    setDevices(inputs);
    setVisibleDevices(filtered);
    setNeedsPermission(permissionRequired);

    if (permissionRequired) {
      setLoadError("");
      return;
    }

    if (resolved.error) {
      setLoadError(resolved.error);
      return;
    }

    setLoadError("");

    if (resolved.deviceId && resolved.deviceId !== preferredDeviceId) {
      onDeviceChange(resolved.deviceId);
      saveStoredInputDeviceId(source, resolved.deviceId);
    }
  };

  const refreshDevices = async (
    requestPermission: boolean,
    source = selectedSourceRef.current
  ) => {
    setIsRefreshing(true);
    setLoadError("");

    try {
      if (requestPermission) {
        await requestMicrophonePermission();
      }

      const inputs = await listMicrophoneDevices();
      applyDeviceList(inputs, source);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
      setNeedsPermission(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const storedSource = loadStoredAudioInputSource();

    if (storedSource !== selectedSource) {
      void onSourceChange(storedSource);
    }

    void refreshDevices(true, storedSource);

    const mediaDevices = navigator.mediaDevices;

    if (!mediaDevices?.addEventListener) {
      return;
    }

    const handleDeviceChange = () => {
      void refreshDevices(false, selectedSourceRef.current);
    };

    mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
    // Load stored preference once on mount; devicechange keeps the list current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSourceChange = async (source: AudioInputSource) => {
    await onSourceChange(source);
    await refreshDevices(true, source);
  };

  const handleDeviceChange = (deviceId: string) => {
    saveStoredInputDeviceId(selectedSource, deviceId);
    onDeviceChange(deviceId);
    setLoadError("");
  };

  const boardFeedConnected = devices.some((device) =>
    isMixerUsbDevice(device.label)
  );

  const showingFallbackDevices =
    !needsPermission &&
    selectedSource === "obs-streaming" &&
    devices.length > 0 &&
    !devices.some((device) => isStreamingInputDevice(device.label));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">2. Audio in</h2>
        <p className="text-sm text-slate-600">
          Same system inputs OBS sees — ClearClick, BlackHole, mic, or Default.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            void handleSourceChange("obs-streaming");
          }}
          className={`rounded-2xl border px-4 py-4 text-left text-sm transition ${
            selectedSource === "obs-streaming"
              ? "border-sky-300 bg-sky-50 text-sky-950 ring-2 ring-sky-200"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <p className="font-semibold">OBS (Streaming)</p>
          <p className="mt-1 text-xs text-slate-600">
            ClearClick (X32), BlackHole, or any other system audio input.
          </p>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            void handleSourceChange("microphone");
          }}
          className={`rounded-2xl border px-4 py-4 text-left text-sm transition ${
            selectedSource === "microphone"
              ? "border-sky-300 bg-sky-50 text-sky-950 ring-2 ring-sky-200"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <p className="font-semibold">Microphone</p>
          <p className="mt-1 text-xs text-slate-600">
            Room mic, headset, or built-in microphone on the church computer.
          </p>
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={selectedDeviceId}
          disabled={disabled || needsPermission || visibleDevices.length === 0}
          onChange={(event) => handleDeviceChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
        >
          <option value="">
            {needsPermission
              ? "Allow microphone access to list devices"
              : visibleDevices.length === 0
                ? "No input devices found"
                : selectedSource === "microphone"
                  ? "Select a microphone"
                  : "Select audio input"}
          </option>
          {visibleDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Input ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={disabled || isRefreshing}
          onClick={() => {
            void refreshDevices(true);
          }}
          className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isRefreshing ? "Refreshing..." : "Allow access & refresh"}
        </button>
      </div>

      {selectedSource === "obs-streaming" ? (
        <p className="text-xs text-slate-500">
          Lists all inputs. Auto-selects ClearClick / X32 when present, then
          BlackHole 2ch.
        </p>
      ) : null}

      {boardFeedConnected ? (
        <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-950">
          ClearClick / X32 board feed detected and selected automatically.
        </p>
      ) : null}

      {needsPermission ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Allow microphone access, then refresh the device list.
        </p>
      ) : null}

      {showingFallbackDevices ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          No ClearClick, X32, or virtual cable found yet. Pick the input that
          matches OBS, or connect the board feed and refresh.
        </p>
      ) : null}

      {loadError ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {loadError}
        </p>
      ) : null}
    </div>
  );
}
