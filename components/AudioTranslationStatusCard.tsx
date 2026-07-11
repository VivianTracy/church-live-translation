type AudioTranslationStatusCardProps = {
  isLive: boolean;
  isListening: boolean;
  seconds: number;
  onToggleLive: () => void;
};

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return [hours, minutes, secs]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

export function AudioTranslationStatusCard({
  isLive,
  isListening,
  seconds,
  onToggleLive,
}: AudioTranslationStatusCardProps) {
  const statusLabel = isLive
    ? isListening
      ? "Translation is live and audio is flowing"
      : "Translation is live — start audio input below"
    : "Ready when setup is complete";

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">3. Go live</h2>
        <p className="text-sm text-slate-600">
          Turn translation on when ready, then start audio input.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 px-5 py-4 text-center space-y-2">
        <p
          className={`text-2xl font-bold ${
            isLive ? "text-emerald-700" : "text-slate-500"
          }`}
        >
          {isLive ? "Live" : "Off"}
        </p>
        <p className="text-sm text-slate-600">{statusLabel}</p>
        {isLive ? (
          <p className="font-mono text-3xl font-semibold text-slate-800">
            {formatTime(seconds)}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onToggleLive}
        className={`w-full rounded-2xl px-6 py-5 text-xl font-bold text-white transition ${
          isLive
            ? "bg-red-600 hover:bg-red-700"
            : "bg-violet-600 hover:bg-violet-700"
        }`}
      >
        {isLive ? "Stop translation" : "Start translation"}
      </button>
    </section>
  );
}
