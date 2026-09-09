"use client";

import {
  listAudioOutputDevices,
  loadStoredAudioOutputDeviceId,
  saveStoredAudioOutputDeviceId,
} from "@/lib/audioOutputDeviceStorage";
import { useEffect, useState } from "react";

type AudioOutputDeviceCardProps = {
  selectedDeviceId: string;
  outputVolume: number;
  outputLanguageLabel?: string;
  disabled?: boolean;
  onDeviceChange: (deviceId: string) => void;
  onVolumeChange: (volume: number) => void;
};

export function AudioOutputDeviceCard({
  selectedDeviceId,
  outputVolume,
  outputLanguageLabel = "translated",
  disabled = false,
  onDeviceChange,
  onVolumeChange,
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
    void Promise.resolve().then(() => refreshDevices());
    // Load the device list once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-400"
        >
          {isRefreshing ? "Refreshing..." : "Refresh list"}
        </button>
      </div>

      {loadError ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {loadError}
        </p>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <label htmlFor="output-volume" className="font-semibold text-slate-700">
            Output volume
          </label>
          <span className="font-mono text-xs text-slate-500">
            {Math.round(outputVolume * 100)}%
          </span>
        </div>
        <input
          id="output-volume"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(outputVolume * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(outputVolume * 100)}
          aria-label="Output volume"
          onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
          className="h-3 w-full cursor-pointer accent-emerald-700"
        />
        <p className="text-xs text-slate-500">
          Loudness sent to the transmitter. You can change this during the
          service.
        </p>
      </div>
    </div>
  );
}
