"use client";

import {
  listMicrophoneDevices,
  loadStoredMicDeviceId,
  requestMicrophonePermission,
  saveStoredMicDeviceId,
} from "@/lib/microphoneDeviceStorage";
import { useEffect, useState } from "react";

type MicrophoneDeviceCardProps = {
  selectedDeviceId: string;
  disabled?: boolean;
  onDeviceChange: (deviceId: string) => void;
};

export function MicrophoneDeviceCard({
  selectedDeviceId,
  disabled = false,
  onDeviceChange,
}: MicrophoneDeviceCardProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [loadError, setLoadError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      const preferredId =
        selectedDeviceId ||
        storedId ||
        inputs.find((device) => device.deviceId)?.deviceId ||
        "";

      if (preferredId && preferredId !== selectedDeviceId) {
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
  }, []);

  const handleChange = (deviceId: string) => {
    saveStoredMicDeviceId(deviceId);
    onDeviceChange(deviceId);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold tracking-widest text-slate-500">
          MICROPHONE INPUT
        </p>
        <p className="text-sm text-slate-600">
          Choose the audio input for captions. For AV replay or OBS streaming,
          select BlackHole (Mac) or VB-Cable (Windows).
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
