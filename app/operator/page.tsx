import { ChurchTranslationHeader } from "@/components/ChurchTranslationHeader";
import { ContactFootnote } from "@/components/ContactFootnote";
import {
  OPERATOR_LANGUAGES_PATH,
  OPERATOR_LIVE_PATH,
} from "@/lib/operatorRoutes";
import Link from "next/link";

export default function OperatorChooserPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl space-y-6">
        <ChurchTranslationHeader />

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Choose translation
          </h2>
          <p className="text-sm text-slate-600">
            Sunday Chinese and English stays on its own page. More languages
            is a separate screen.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={OPERATOR_LIVE_PATH}
              className="rounded-2xl bg-emerald-600 px-5 py-5 text-center text-lg font-bold text-white transition hover:bg-emerald-700"
            >
              Chinese and English
            </Link>
            <Link
              href={OPERATOR_LANGUAGES_PATH}
              className="rounded-2xl bg-white px-5 py-5 text-center text-lg font-bold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              More languages
            </Link>
          </div>

          <p className="text-xs text-slate-500">
            Chinese and English can auto-detect the sermon. More languages
            covers English, Chinese, Korean, French, and Spanish.
          </p>
        </section>

        <ContactFootnote />
      </div>
    </main>
  );
}
