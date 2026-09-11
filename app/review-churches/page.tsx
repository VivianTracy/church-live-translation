import { ReviewChurchesList } from "@/app/review-churches/ReviewChurchesList";
import { ChurchTranslationHeader } from "@/components/ChurchTranslationHeader";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import Link from "next/link";

export default function ReviewChurchesPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-md space-y-6">
        <ChurchTranslationHeader showSignOut />

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Confirm new churches
          </h2>
          <p className="text-sm text-slate-600">
            Check these details, then confirm so they can sign in.
          </p>

          {isSupabaseConfigured() ? (
            <ReviewChurchesList />
          ) : (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
              Church review is not configured.
            </p>
          )}
        </section>

        <p className="text-center text-sm text-slate-600">
          <Link href="/operator-live" className="font-medium text-emerald-800">
            Back to translation
          </Link>
        </p>
      </div>
    </main>
  );
}
