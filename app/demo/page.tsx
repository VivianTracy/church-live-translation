import { DemoStart } from "@/app/demo/DemoStart";
import { ChurchTranslationHeader } from "@/components/ChurchTranslationHeader";
import { ContactFootnote } from "@/components/ContactFootnote";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import Link from "next/link";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-md space-y-6">
        <ChurchTranslationHeader />

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            5-minute demo
          </h2>
          <p className="text-sm text-slate-600">
            This opens the sample church account. It signs out on its own after
            5 minutes.
          </p>

          {isSupabaseConfigured() ? (
            <DemoStart />
          ) : (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
              Church sign-in is not configured. Add the Supabase keys on Vercel
              or in <span className="font-mono">.env.local</span>.
            </p>
          )}
        </section>

        {isSupabaseConfigured() ? null : (
          <p className="text-center text-sm text-slate-600">
            <Link href="/login" className="font-medium text-emerald-800">
              Church sign in
            </Link>
          </p>
        )}

        <ContactFootnote />
      </div>
    </main>
  );
}
