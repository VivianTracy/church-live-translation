import { LoginForm } from "@/app/login/LoginForm";
import { ChurchTranslationHeader } from "@/components/ChurchTranslationHeader";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-md space-y-6">
        <ChurchTranslationHeader />

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Church operator sign in
          </h2>
          <p className="text-sm text-slate-600">
            Use the email and password for this church. Phone listeners do not
            sign in. They use this church’s QR code.
          </p>

          {isSupabaseConfigured() ? (
            <Suspense
              fallback={
                <p className="text-sm text-slate-500">Loading sign in…</p>
              }
            >
              <LoginForm />
            </Suspense>
          ) : (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
              Church sign-in is not configured. Add the Supabase keys on Vercel
              or in <span className="font-mono">.env.local</span>.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
