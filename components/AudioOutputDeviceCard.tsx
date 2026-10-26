"use client";

import {
  listAudioOutputDevices,
  loadStoredAudioOutputDeviceId,
  saveStoredAudioOutputDeviceId,
} from "@/lib/audioOutputDeviceStorage";
import {
  playOutputTestTone,
  stopOutputTestTone,
} from "@/lib/audioOutputTest";
import { useEffect, useRef, useState } from "react";

type AudioOutputDeviceCardProps = {
  selectedDeviceId: string;
  outputVolume: number;
  outputLanguageLabel?: string;
  disabled?: boolean;
  onDeviceChange: (deviceId: string) => void;
  onVolumeChange: (volume: number) => void;
};

function SpeakerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M4 10v4h4l5 4V6L8 10H4z" />
      <path d="M16.5 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M19 7a7 7 0 0 1 0 10" />
    </svg>
  );
}

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
  const [testMessage, setTestMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const mountedRef = useRef(true);

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
    mountedRef.current = true;
    void Promise.resolve().then(() => refreshDevices());
    return () => {
      mountedRef.current = false;
      stopOutputTestTone();
    };
    // Load the device list once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTest = async () => {
    setIsTesting(true);
    setTestMessage("");

    const message = await playOutputTestTone({
      deviceId: selectedDeviceId,
      volume: outputVolume,
    });

    if (!mountedRef.current) {
      return;
    }

    setIsTesting(false);
    setTestMessage(message ?? "");
  };

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
          disabled={disabled || isTesting}
          onClick={() => {
            void handleTest();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          aria-label="Play a test sound on the selected output"
        >
          <SpeakerIcon />
          {isTesting ? "Playing…" : "Test sound"}
        </button>

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

      <p className="text-xs text-slate-500">
        Test sound plays a short chime on this output. Translation stays off.
      </p>

      {testMessage ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-950">
          {testMessage}
        </p>
      ) : null}

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
