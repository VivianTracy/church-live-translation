"use client";

import {
  isMixerUsbDevice,
  isStreamingInputDevice,
  isVirtualCableDevice,
} from "@/lib/audioInputSource";
import {
  listMicrophoneDevices,
  loadStoredMicDeviceId,
  requestMicrophonePermission,
  saveStoredMicDeviceId,
} from "@/lib/microphoneDeviceStorage";
import { useEffect, useRef, useState } from "react";

type MicrophoneDeviceCardProps = {
  selectedDeviceId: string;
  disabled?: boolean;
  onDeviceChange: (deviceId: string) => void;
};

function pickPreferredCaptionInput(
  inputs: MediaDeviceInfo[],
  selectedDeviceId: string,
  storedId: string
): string {
  const preferredExisting =
    inputs.find((device) => device.deviceId === selectedDeviceId)?.deviceId ||
    inputs.find((device) => device.deviceId === storedId)?.deviceId ||
    "";

  const mixerId = inputs.find(
    (device) => device.deviceId && isMixerUsbDevice(device.label)
  )?.deviceId;

  if (mixerId) {
    if (
      preferredExisting &&
      inputs.some(
        (device) =>
          device.deviceId === preferredExisting &&
          isMixerUsbDevice(device.label)
      )
    ) {
      return preferredExisting;
    }

    return mixerId;
  }

  if (preferredExisting) {
    return preferredExisting;
  }

  return (
    inputs.find(
      (device) => device.deviceId && isVirtualCableDevice(device.label)
    )?.deviceId ||
    inputs.find((device) => device.deviceId)?.deviceId ||
    ""
  );
}

export function MicrophoneDeviceCard({
  selectedDeviceId,
  disabled = false,
  onDeviceChange,
}: MicrophoneDeviceCardProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [loadError, setLoadError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const selectedDeviceIdRef = useRef(selectedDeviceId);

  selectedDeviceIdRef.current = selectedDeviceId;

  const refreshDevices = async (requestPermission: boolean) => {
    setIsRefreshing(true);
    setLoadError("");

    try {
      if (requestPermission) {
        await requestMicrophonePermission();
      }

      const inputs = await listMicrophoneDevices();
      setDevices(inputs);

      const storedId = loadStoredMicDeviceId();
      const preferredId = pickPreferredCaptionInput(
        inputs,
        selectedDeviceIdRef.current,
        storedId
      );

      if (preferredId && preferredId !== selectedDeviceIdRef.current) {
        saveStoredMicDeviceId(preferredId);
        onDeviceChange(preferredId);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void refreshDevices(false);

    const mediaDevices = navigator.mediaDevices;

    if (!mediaDevices?.addEventListener) {
      return;
    }

    const handleDeviceChange = () => {
      void refreshDevices(false);
    };

    mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (deviceId: string) => {
    saveStoredMicDeviceId(deviceId);
    onDeviceChange(deviceId);
  };

  const mixerConnected = devices.some((device) =>
    isMixerUsbDevice(device.label)
  );
  const streamingInputConnected = devices.some((device) =>
    isStreamingInputDevice(device.label)
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold tracking-widest text-slate-500">
          MICROPHONE INPUT
        </p>
        <p className="text-sm text-slate-600">
          Choose the audio input for captions. ClearClick / X32 is selected
          automatically when connected; otherwise use BlackHole 2ch (Mac) or
          VB-Cable (Windows).
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={selectedDeviceId}
          disabled={disabled || devices.length === 0}
          onChange={(event) => handleChange(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900"
        >
          <option value="">
            {devices.length === 0
              ? "No microphones found"
              : "Default microphone"}
          </option>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={disabled || isRefreshing}
          onClick={() => {
            void refreshDevices(true);
          }}
          className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isRefreshing ? "Refreshing..." : "Refresh list"}
        </button>
      </div>

      {mixerConnected ? (
        <p className="rounded-2xl bg-sky-50 p-3 text-xs font-semibold text-sky-950">
          ClearClick / X32 detected — selected automatically when available.
        </p>
      ) : null}

      {!mixerConnected && streamingInputConnected ? (
        <p className="text-xs text-slate-500">
          Virtual cable detected. Connect ClearClick for the X32 board feed to
          select it automatically.
        </p>
      ) : null}

      {loadError ? (
        <p className="rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">
          {loadError}
        </p>
      ) : null}

      <p className="text-xs text-slate-500">
        Click Refresh list and allow microphone access if device names are blank.
        Stop the microphone before changing inputs.
      </p>
    </section>
  );
}
