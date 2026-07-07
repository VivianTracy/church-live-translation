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
  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center space-y-6">
      <p className="text-sm font-bold tracking-widest text-slate-500">STATUS</p>

      <div className="space-y-2">
        <p className="text-6xl font-bold">{isLive ? "🟢 LIVE" : "⚪ OFF"}</p>
        <p className="text-2xl text-slate-600">
          {isLive
            ? isListening
              ? "Translation channel active · Audio flowing"
              : "Translation channel active"
            : isListening
              ? "Audio input running"
              : "Ready to start"}
        </p>
        <p className="text-4xl font-mono font-semibold text-slate-800">
          {formatTime(seconds)}
        </p>
      </div>

      <button
        onClick={onToggleLive}
        className={`w-full rounded-2xl px-8 py-7 text-3xl font-bold text-white shadow-sm transition ${
          isLive
            ? "bg-red-600 hover:bg-red-700"
            : "bg-violet-600 hover:bg-violet-700"
        }`}
      >
        {isLive ? "🔴 Stop Live Translation" : "🟢 Start Live Translation"}
      </button>
    </section>
  );
}
