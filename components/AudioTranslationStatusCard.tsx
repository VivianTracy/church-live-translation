import {
  MAX_AUTO_RECONNECT_ATTEMPTS,
  type OperatorSessionStatus,
} from "@/lib/operatorSessionState";

type AudioTranslationStatusCardProps = {
  status: OperatorSessionStatus;
  seconds: number;
  autoReconnectsUsed: number;
  error: string;
  onStart: () => void;
  onStop: () => void;
};

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return [hours, minutes, secs]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

function statusPresentation(status: OperatorSessionStatus, error: string) {
  switch (status) {
    case "connecting":
      return {
        label: "Connecting",
        className: "text-amber-700",
        detail: "Starting translation…",
      };
    case "live":
      return {
        label: "Live",
        className: "text-emerald-700",
        detail: "Translation is running",
      };
    case "reconnecting":
      return {
        label: "Reconnecting",
        className: "text-amber-700",
        detail: error || "Connection dropped. Trying again…",
      };
    case "failed":
      return {
        label: "Failed",
        className: "text-red-700",
        detail: error || "Translation stopped. Reconnect to continue.",
      };
    default:
      return {
        label: "Off",
        className: "text-slate-500",
        detail: "Ready when setup is complete",
      };
  }
}

export function AudioTranslationStatusCard({
  status,
  seconds,
  autoReconnectsUsed,
  error,
  onStart,
  onStop,
}: AudioTranslationStatusCardProps) {
  const presentation = statusPresentation(status, error);
  const showTimer = status !== "off";
  const canStop =
    status === "connecting" || status === "live" || status === "reconnecting";

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">3. Start translation</h2>
        <p className="text-sm text-slate-600">
          One click starts devices, the translation session, and headset audio.
        </p>
      </div>

      <div
        className={`rounded-2xl px-5 py-4 text-center space-y-2 ${
          status === "failed"
            ? "bg-red-50 ring-2 ring-red-200"
            : status === "live"
              ? "bg-emerald-50"
              : "bg-slate-50"
        }`}
        aria-live={status === "failed" ? "assertive" : "polite"}
      >
        <p className={`text-2xl font-bold ${presentation.className}`}>
          {presentation.label}
        </p>
        <p className="text-sm text-slate-600">{presentation.detail}</p>
        {status === "reconnecting" ? (
          <p className="text-xs font-medium text-amber-800">
            Attempt {autoReconnectsUsed} of {MAX_AUTO_RECONNECT_ATTEMPTS}
          </p>
        ) : null}
        {showTimer ? (
          <p className="font-mono text-3xl font-semibold text-slate-800">
            {formatTime(seconds)}
          </p>
        ) : null}
      </div>

      {canStop ? (
        <button
          type="button"
          onClick={onStop}
          className="w-full rounded-2xl bg-red-600 px-6 py-5 text-xl font-bold text-white transition hover:bg-red-700"
        >
          Stop translation
        </button>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className={`w-full rounded-2xl px-6 py-5 text-xl font-bold text-white transition ${
            status === "failed"
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {status === "failed" ? "Reconnect" : "Start translation"}
        </button>
      )}
    </section>
  );
}
