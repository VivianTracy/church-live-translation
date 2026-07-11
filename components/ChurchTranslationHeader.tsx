import { CURRENT_SERVICE } from "@/lib/service";

export function ChurchTranslationHeader() {
  return (
    <header className="text-center space-y-2">
      <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
        Live translation console
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Church Translation
      </h1>
      <p className="text-lg text-slate-600">
        Live audio to wireless headsets
      </p>
      <p className="text-sm text-slate-500">{CURRENT_SERVICE.churchName}</p>
    </header>
  );
}
