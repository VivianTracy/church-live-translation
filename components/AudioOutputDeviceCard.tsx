"use client";

import {
  listAudioOutputDevices,
  loadStoredAudioOutputDeviceId,
  saveStoredAudioOutputDeviceId,
} from "@/lib/audioOutputDeviceStorage";
import { useEffect, useState } from "react";

type AudioOutputDeviceCardProps = {
  selectedDeviceId: string;
  outputLanguageLabel?: string;
  disabled?: boolean;
  onDeviceChange: (deviceId: string) => void;
};

export function AudioOutputDeviceCard({
  selectedDeviceId,
  outputLanguageLabel = "translated",
  disabled = false,
  onDeviceChange,
}: AudioOutputDeviceCardProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [loadError, setLoadError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshDevices = async () => {
    setIsRefreshing(true);
    setLoadError("");

    try {
      const outputs = await listAudioOutputDevices();
      setDevices(outputs);

      const storedId = loadStoredAudioOutputDeviceId();
      const preferredId =
        selectedDeviceId ||
        storedId ||
        outputs.find((device) => device.deviceId)?.deviceId ||
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
    void refreshDevices();
  }, []);

  const handleChange = (deviceId: string) => {
    saveStoredAudioOutputDeviceId(deviceId);
    onDeviceChange(deviceId);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Audio out</h2>
        <p className="text-sm text-slate-600">
          Where {outputLanguageLabel} audio goes — usually monitor headphone
          jack or USB audio dongle to the TT125 transmitter.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={selectedDeviceId}
          disabled={disabled || devices.length === 0}
          onChange={(event) => handleChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
        >
          <option value="">
            {devices.length === 0
              ? "No output devices found"
              : "Default system output"}
          </option>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Output ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={disabled || isRefreshing}
          onClick={() => {
            void refreshDevices();
          }}
          className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-400"
        >
          {isRefreshing ? "Refreshing..." : "Refresh list"}
        </button>
      </div>

      {loadError ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {loadError}
        </p>
      ) : null}
    </div>
  );
}
