type TranslationSetupSummaryProps = {
  directionLabel: string;
  inputSourceLabel: string;
  inputDeviceLabel: string;
  outputDeviceLabel: string;
  isRouting: boolean;
};

export function TranslationSetupSummary({
  directionLabel,
  inputSourceLabel,
  inputDeviceLabel,
  outputDeviceLabel,
  isRouting,
}: TranslationSetupSummaryProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-800">Current setup</p>
        <p className="text-xs font-medium text-slate-600">
          {isRouting ? "Routing audio" : "Not routing yet"}
        </p>
      </div>

      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Direction</dt>
          <dd className="font-medium text-slate-900">{directionLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Input</dt>
          <dd className="font-medium text-slate-900">
            {inputSourceLabel}
            {inputDeviceLabel ? ` · ${inputDeviceLabel}` : ""}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-slate-500">Transmitter output</dt>
          <dd className="font-medium text-slate-900">
            {outputDeviceLabel || "Not selected"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
