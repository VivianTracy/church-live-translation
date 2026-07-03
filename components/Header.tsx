import { CURRENT_SERVICE } from "@/lib/service";

export function Header() {
  return (
    <header className="text-center space-y-3">
      <h1 className="text-5xl font-bold tracking-tight">Church Caption</h1>

      <p className="text-xl text-slate-600">
        {CURRENT_SERVICE.serviceName}
      </p>

      <p className="text-base text-slate-500">
        {CURRENT_SERVICE.churchName}
      </p>

      <p className="text-2xl font-semibold text-slate-800">
        {CURRENT_SERVICE.sourceLanguage} → {CURRENT_SERVICE.targetLanguage}
      </p>
    </header>
  );
}