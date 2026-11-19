import { PhoneLineWindow } from "@/components/PhoneLineWindow";
import { Suspense } from "react";

export default function OperatorPhonePage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-slate-900">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <PhoneLineWindow />
      </Suspense>
    </main>
  );
}
