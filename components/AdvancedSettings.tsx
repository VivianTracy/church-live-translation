type AdvancedSettingsProps = {
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
};

export function AdvancedSettings({
  showAdvanced,
  onToggleAdvanced,
}: AdvancedSettingsProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <button
        onClick={onToggleAdvanced}
        className="flex w-full items-center justify-between text-left text-lg font-semibold"
      >
        <span>Advanced Settings</span>
        <span>{showAdvanced ? "−" : "+"}</span>
      </button>

      {showAdvanced && (
        <div className="mt-5 space-y-3">
          <p className="text-sm text-slate-500">
            Glossary terms are set before worship. The operator usually does not
            need to change these during the service.
          </p>

          <textarea
            className="h-40 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            defaultValue={`恩典 = grace
称义 = justification
成圣 = sanctification
圣灵 = Holy Spirit
福音 = gospel
以弗所书 = Ephesians`}
          />
        </div>
      )}
    </section>
  );
}