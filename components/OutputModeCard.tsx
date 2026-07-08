import type { OutputMode } from "@/lib/outputModeStorage";

type OutputModeCardProps = {
  mode: OutputMode;
  disabled?: boolean;
  onModeChange: (mode: OutputMode) => void;
};

const MODE_OPTIONS: {
  value: OutputMode;
  title: string;
  description: string;
  activeClass: string;
}[] = [
  {
    value: "audio",
    title: "Audio",
    description: "English audio to translation channel (earpieces)",
    activeClass: "bg-violet-600 text-white shadow-sm",
  },
  {
    value: "captions",
    title: "Captions",
    description: "English captions on YouTube via OBS overlay",
    activeClass: "bg-sky-600 text-white shadow-sm",
  },
  {
    value: "both",
    title: "Both",
    description: "Earpiece audio and YouTube captions together",
    activeClass: "bg-emerald-600 text-white shadow-sm",
  },
];

export function OutputModeCard({
  mode,
  disabled = false,
  onModeChange,
}: OutputModeCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold tracking-widest text-slate-500">
          OUTPUT MODE
        </p>
        <p className="text-sm text-slate-600">
          Choose what this console sends during worship. The caption-only page at{" "}
          <span className="font-mono text-xs">/operator-caption</span> stays
          available separately.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {MODE_OPTIONS.map((option) => {
          const isActive = mode === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onModeChange(option.value)}
              className={`rounded-2xl px-4 py-4 text-left transition ${
                isActive
                  ? option.activeClass
                  : "border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <p className="text-lg font-bold">{option.title}</p>
              <p
                className={`mt-1 text-sm ${
                  isActive ? "text-white/90" : "text-slate-600"
                }`}
              >
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
