"use client";

import {
  listAudioOutputDevices,
  loadStoredAudioOutputDeviceId,
  saveStoredAudioOutputDeviceId,
} from "@/lib/audioOutputDeviceStorage";
import { useEffect, useState } from "react";

type AudioOutputDeviceCardProps = {
  selectedDeviceId: string;
  disabled?: boolean;
  onDeviceChange: (deviceId: string) => void;
};

export function AudioOutputDeviceCard({
  selectedDeviceId,
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
    <section className="rounded-3xl border border-violet-200 bg-white p-6 shadow-sm ring-1 ring-violet-100 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold tracking-widest text-violet-700">
          TRANSLATION CHANNEL OUTPUT
        </p>
        <p className="text-sm text-slate-600">
          Choose where English audio is sent. Route this to your church&apos;s
          translation channel so earpiece listeners hear the sermon in English.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={selectedDeviceId}
          disabled={disabled || devices.length === 0}
          onChange={(event) => handleChange(event.target.value)}
          className="w-full rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-slate-900"
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
          className="rounded-2xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-400"
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
        Connect this output to your translation transmitter input (mixer aux,
        FM/IR system, or a dedicated translation laptop). Stop translation before
        changing outputs.
      </p>
    </section>
  );
}
