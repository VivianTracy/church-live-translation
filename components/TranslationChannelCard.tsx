type TranslationChannelCardProps = {
  isRouting: boolean;
  outputDeviceLabel?: string;
};

export function TranslationChannelCard({
  isRouting,
  outputDeviceLabel,
}: TranslationChannelCardProps) {
  return (
    <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-sm text-violet-950 space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-bold tracking-widest text-violet-800">
          AUDIO PATH
        </p>
        <p className="text-base font-semibold">
          Chinese sermon audio becomes English audio for earpiece listeners.
        </p>
      </div>

      <div className="rounded-2xl bg-white/80 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-2 text-center text-sm font-semibold">
          <span className="rounded-xl bg-sky-100 px-3 py-2 text-sky-900">
            Chinese audio in
          </span>
          <span className="text-violet-400">→</span>
          <span className="rounded-xl bg-violet-100 px-3 py-2 text-violet-900">
            AI translation
          </span>
          <span className="text-violet-400">→</span>
          <span className="rounded-xl bg-emerald-100 px-3 py-2 text-emerald-900">
            English audio out
          </span>
          <span className="text-violet-400">→</span>
          <span className="rounded-xl bg-amber-100 px-3 py-2 text-amber-900">
            Translation channel
          </span>
          <span className="text-violet-400">→</span>
          <span className="rounded-xl bg-slate-200 px-3 py-2 text-slate-900">
            Earpieces
          </span>
        </div>

        <p className="text-center text-xs text-violet-900/80">
          This page replaces a live human interpreter on the translation channel.
          YouTube captions on <span className="font-mono">/overlay</span> stay
          separate.
        </p>
      </div>

      <div className="rounded-2xl bg-white/70 p-4 space-y-2 text-xs">
        <p>
          Channel status:{" "}
          <span className="font-semibold">
            {isRouting ? "Routing English audio" : "Not routing"}
          </span>
        </p>
        <p>
          Output device:{" "}
          <span className="font-semibold">
            {outputDeviceLabel || "Not selected"}
          </span>
        </p>
      </div>
    </section>
  );
}
