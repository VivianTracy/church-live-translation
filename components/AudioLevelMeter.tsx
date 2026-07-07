type AudioLevelMeterProps = {
  label: string;
  level: number;
  peak?: number;
  active?: boolean;
  accent?: "sky" | "violet" | "emerald";
};

const ACCENT_FILL: Record<NonNullable<AudioLevelMeterProps["accent"]>, string> =
  {
    sky: "bg-sky-500",
    violet: "bg-violet-500",
    emerald: "bg-emerald-500",
  };

const ACCENT_TRACK: Record<
  NonNullable<AudioLevelMeterProps["accent"]>,
  string
> = {
  sky: "bg-sky-100",
  violet: "bg-violet-100",
  emerald: "bg-emerald-100",
};

export function AudioLevelMeter({
  label,
  level,
  peak,
  active = false,
  accent = "sky",
}: AudioLevelMeterProps) {
  const clampedLevel = Math.min(1, Math.max(0, level));
  const clampedPeak =
    peak === undefined ? undefined : Math.min(1, Math.max(0, peak));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-mono text-xs text-slate-500">
          {active ? `${Math.round(clampedLevel * 100)}%` : "—"}
        </span>
      </div>

      <div
        className={`relative h-4 overflow-hidden rounded-full ${ACCENT_TRACK[accent]}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-75 ${ACCENT_FILL[accent]}`}
          style={{ width: `${clampedLevel * 100}%` }}
        />
        {clampedPeak !== undefined && active ? (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-800/60"
            style={{ left: `${clampedPeak * 100}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}
