type TranslationChannelCardProps = {
  isRouting: boolean;
  inputLanguageLabel: string;
  outputLanguageLabel: string;
  channelSummary: string;
  inputSourceLabel?: string;
  inputDeviceLabel?: string;
  outputDeviceLabel?: string;
};

export function TranslationChannelCard({
  isRouting,
  inputLanguageLabel,
  outputLanguageLabel,
  channelSummary,
  inputSourceLabel,
  inputDeviceLabel,
  outputDeviceLabel,
}: TranslationChannelCardProps) {
  return (
    <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-sm text-violet-950 space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-bold tracking-widest text-violet-800">
          AUDIO PATH
        </p>
        <p className="text-base font-semibold">{channelSummary}</p>
      </div>

      <div className="rounded-2xl bg-white/80 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-2 text-center text-sm font-semibold">
          <span className="rounded-xl bg-sky-100 px-3 py-2 text-sky-900">
            {inputLanguageLabel} audio in
          </span>
          <span className="text-violet-400">→</span>
          <span className="rounded-xl bg-violet-100 px-3 py-2 text-violet-900">
            AI translation
          </span>
          <span className="text-violet-400">→</span>
          <span className="rounded-xl bg-emerald-100 px-3 py-2 text-emerald-900">
            {outputLanguageLabel} audio out
          </span>
          <span className="text-violet-400">→</span>
          <span className="rounded-xl bg-amber-100 px-3 py-2 text-amber-900">
            TT125 transmitter
          </span>
          <span className="text-violet-400">→</span>
          <span className="rounded-xl bg-slate-200 px-3 py-2 text-slate-900">
            Wireless headsets
          </span>
        </div>

        <p className="text-center text-xs text-violet-900/80">
          Run this on the church computer. Connect {outputLanguageLabel} output to
          the Retekess TT125-TX MIC port with a 3.5 mm cable.
        </p>
      </div>

      <div className="rounded-2xl bg-white/70 p-4 space-y-2 text-xs">
        <p>
          Channel status:{" "}
          <span className="font-semibold">
            {isRouting ? `Routing ${outputLanguageLabel} audio` : "Not routing"}
          </span>
        </p>
        <p>
          Input source:{" "}
          <span className="font-semibold">
            {inputSourceLabel || "Not selected"}
          </span>
        </p>
        <p>
          Input device:{" "}
          <span className="font-semibold">
            {inputDeviceLabel || "Not selected"}
          </span>
        </p>
        <p>
          Transmitter output:{" "}
          <span className="font-semibold">
            {outputDeviceLabel || "Not selected"}
          </span>
        </p>
      </div>
    </section>
  );
}
